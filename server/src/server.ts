import { ConfigInstance } from './config/instance';
import { getRoutes } from './routes';
import express, { Response, NextFunction } from 'express';
import { jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import bodyParser from 'body-parser';
import cors from 'cors';
import nocache from 'nocache';
import { FileSystemStorageProvider } from './extensions/storage/FileSystem/filesystem';
import { ExtensionRepository } from './extensions/repository';
import { BasicHTTPExfilProvider } from './extensions/exfil/BasicHttp/basichttp';
import { Logger } from './logging';
import { AwsCloudFrontExfilProvider } from './extensions/exfil/AwsCloudFront/awscloudfront';
import { AwsS3StorageProvider } from './extensions/storage/AwsS3/awss3';
import { QuicExfilProvider } from './extensions/exfil/Quic/quic';
import https from 'https';
import fs from 'fs';

const EXTENSIONS = [
  BasicHTTPExfilProvider,
  FileSystemStorageProvider,
  AwsCloudFrontExfilProvider,
  QuicExfilProvider,
  AwsS3StorageProvider,
];

const logger = Logger.Instance.defaultLogger;

logger.info('Starting up...');

const main = async (): Promise<void> => {
  logger.info('Initializing config...');
  await ConfigInstance.init();

  for (var i = 0; i < ConfigInstance.Inst.storage.length; i++) {
    const storage = ConfigInstance.Inst.storage[i];
    const prov = EXTENSIONS.find((e) => e.extension_name == storage.type);
    if (!prov)
      throw new Error(`Invalid StorageProvider type "${storage.type}"`);

    logger.info(
      `Initializing extension "${storage.name}" (${prov.extension_name})...`
    );
    const inst = prov.create(storage);
    await inst.init(ConfigInstance.Inst);
    if (inst.state == 'InitializationError')
      throw new Error(
        `Initialization of extension "${storage.name}" (${prov.extension_name}) failed!`
      );
  }

  for (var i = 0; i < ConfigInstance.Inst.exfil.length; i++) {
    const exfil = ConfigInstance.Inst.exfil[i];
    const prov = EXTENSIONS.find((e) => e.extension_name == exfil.type);
    if (!prov) throw new Error(`Invalid ExfilProvider type "${exfil.type}"`);

    logger.info(
      `Initializing extension "${exfil.name}" (${prov.extension_name})...`
    );
    const inst = prov.create(exfil);
    await inst.init(ConfigInstance.Inst);
    if (inst.state == 'InitializationError')
      throw new Error(
        `Initialization of extension "${exfil.name}" (${prov.extension_name}) failed!`
      );
  }

  const app = express();

  app.disable('x-powered-by');

  app.use(nocache());
  app.use(
    cors({
      origin: (origin, cb) => {
        Promise.all(
          ExtensionRepository.getInstance().exfils.map((e) => e.hosts)
        ).then((all) => cb(null, all.flat()));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      credentials: true,
    })
  ); // TODO: Disable in prod!

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
    logger.info(`Installing routes for ${extension.instance_name}...`);
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
  const HOST = ConfigInstance.Inst.general.host || 'localhost';
  if (ConfigInstance.Inst.general.ssl) {
    https
      .createServer({
          key: fs.readFileSync(ConfigInstance.Inst.general.ssl.key_file),
          cert: fs.readFileSync(ConfigInstance.Inst.general.ssl.cert_file),
        },
      app).listen(PORT, HOST, function () {
        logger.info(`VolatileVault is listening at https://${HOST}:${PORT}!`);
      });
  } else {
    app.listen(PORT, HOST, () => {
      logger.info(`VolatileVault is listening at http://${HOST}:${PORT}!`);
    });
  }
};

main().catch((error) => {
  logger.error(error.message);
});
