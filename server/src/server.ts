import { routes } from './routes';
import express, { Response, NextFunction } from 'express';
import { Keys, jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import { FsUtils } from './fs';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import cors from 'cors';
import config from './config';

FsUtils.init();

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

app.use(routes);

app.use((error, req, res, next) => {
  return res.status(400).json({ message: error?.message ?? 'Failure' });
});

app.use(express.static('public'));

cron.schedule('0 * * * * *', () => {
  FsUtils.cleanup(1000 * 60 * config.FILE_EXPIRY);
});

const PORT = config.BACKEND_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`);
});
