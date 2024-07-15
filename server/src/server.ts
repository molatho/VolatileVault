import { ConfigInstance } from './config/instance';
import { getRoutes } from './routes';
import express, { Response, NextFunction } from 'express';
import { jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import bodyParser from 'body-parser';
import cors from 'cors';
import nocache from 'nocache';
import { FileSystemStorageProvider } from './extensions/storage/filesystem';
import { ExtensionRepository } from './extensions/repository';
import { BasicHTTPExfilProvider } from './extensions/exfil/basichttp';
import { Logger } from './logging';
import { AwsCloudFrontExfilProvider } from './extensions/exfil/awscloudfront';

const EXTENSIONS = [
  new BasicHTTPExfilProvider(),
  new FileSystemStorageProvider(),
  new AwsCloudFrontExfilProvider()
];

const logger = Logger.Instance.defaultLogger;

logger.info('Starting up...');

const main = async (): Promise<void> => {
  logger.info('Initializing config...');
  await ConfigInstance.init();

  for (const extension of EXTENSIONS) {
    logger.info(`Initializing extension ${extension.name}...`);
    await extension.init(ConfigInstance.Inst);
  }

  const failed = EXTENSIONS.filter(e=>e.state == 'InitializationError');
  if (failed.length > 0) {
    throw new Error(`The following extension(s) failed to initialize: ${failed.map(f=>f.name).join(", ")}`)
  }

  if (ExtensionRepository.getInstance().exfils.length == 0)
    throw new Error(
      'No exfil provider was initialized: verify that at least one is configured.'
    );

  if (ExtensionRepository.getInstance().storages.length == 0)
    throw new Error(
      'No storage provider was initialized: verify that at least one is configured.'
    );

  const app = express();

  app.disable('x-powered-by');

  app.use(nocache());
  app.use(cors()); // TODO: Disable in prod!

  app.use(bodyParser.urlencoded({ extended: false }));

  app.use(
    '/api',
    jwt.unless({ path: [{ url: '/api/auth', method: 'POST' }] }),
    (
      err: UnauthorizedError,
      req: JWTRequest,
      res: Response,
      next: NextFunction
    ) => {
      if (err || !req.auth?.sub)
        return res.status(401).json({ message: 'Authentication failure' });
      return next();
    }
  );

  app.use(getRoutes());
  for (const extension of ExtensionRepository.getInstance().exfils) {
    logger.info(`Installing routes for ${extension.name}...`);
    await extension.installRoutes(app);
  }

  app.use((error, req, res, next) => {
    return res.status(400).json({ message: error?.message ?? 'Failure' });
  });

  app.use(express.static('public'));

  for (const extension of ExtensionRepository.getInstance().exfils) {
    await extension.installCron();
  }
  for (const extension of ExtensionRepository.getInstance().storages) {
    await extension.installCron();
  }

  const PORT = ConfigInstance.Inst.general.port || 3000;
  app.listen(PORT, () => {
    logger.info(`Application started on port ${PORT}!`);
  });
};

main().catch((error) => {
  logger.error(error.message);
});
