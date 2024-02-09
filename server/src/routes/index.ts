import express from 'express';
import { authRoute } from './auth';
import { uploadRoute } from './upload';
import { downloadRoute } from './download';
import { configRoute } from './config';

export const routes = express.Router();

routes.use(authRoute);
routes.use(downloadRoute);
routes.use(uploadRoute);
routes.use(configRoute);
