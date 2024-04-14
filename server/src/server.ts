import { ConfigInstance } from './config/instance';
import { getRoutes } from './routes';
import express, { Response, NextFunction } from 'express';
import { jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import bodyParser from 'body-parser';
import cors from 'cors';
import { FileSystemStorageProvider } from './storage/filesystem';
import { ExtensionRepository } from './extensions/repository';

const EXTENSIONS = [
  new FileSystemStorageProvider()
]

const main = async (): Promise<void> => {
  console.log('Initializing config...');
  await ConfigInstance.init();

  for (const extension of EXTENSIONS) {
    console.log(`Initializing extension ${extension.name}...`)
    await extension.init(ConfigInstance.Inst);
  }

  const app = express();

  app.use(cors());

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
    console.log(`Installing routes for ${extension.name}...`)
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
    console.log(`Application started on port ${PORT}!`);
  });
};

main();
