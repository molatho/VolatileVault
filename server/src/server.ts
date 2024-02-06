import { routes } from './routes';
import express, { Request, Response, NextFunction } from 'express';
import { jwt } from './jwt';
import { Request as JWTRequest, UnauthorizedError } from "express-jwt";
import dotenv from 'dotenv';
import { FsUtils } from './fs';
import bodyParser from 'body-parser';
import cron from 'node-cron';

FsUtils.init();

dotenv.config();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

app.use("/api/files", jwt, (err: UnauthorizedError, req:JWTRequest , res: Response, next: NextFunction) => {
  if (err || !req.auth?.sub) return res.status(401).send();
  return next();
});

app.use(routes);

cron.schedule("0 * * * * *", () => {
  FsUtils.cleanup(1000 * 60 * 30)
})

const PORT = process.env.BACKEND_PORT || 3000
app.listen(PORT, () => {
  console.log(`Application started on port ${PORT}!`);
});
