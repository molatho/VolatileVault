import { routes } from './routes';
import express, { Request, Response, NextFunction } from 'express';
import { jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from 'express-jwt';
import dotenv from 'dotenv';
import { FsUtils } from './fs';
import bodyParser from 'body-parser';
import cron from 'node-cron';
import cors from 'cors';

FsUtils.init();

dotenv.config();

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

cron.schedule('0 * * * * *', () => {
  FsUtils.cleanup(1000 * 60 * parseInt(process.env.FILE_EXPIRY));
});

const PORT = process.env.BACKEND_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`);
});
