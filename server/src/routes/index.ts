import express from 'express';
import { authRoute } from './auth';
import { uploadRoute } from './upload';
import { downloadRoute } from './download';

export const routes = express.Router();

routes.use(authRoute);
routes.use(downloadRoute);
routes.use(uploadRoute);
