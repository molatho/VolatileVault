import express from 'express';
import { getAuthRoute } from './auth';
import { getUploadRoute } from './upload';
import { getDownloadRoute } from './download';
import { getConfigRoute } from './config';

export const getRoutes = () => {
  const routes = express.Router();
  routes.use(getAuthRoute());
  routes.use(getDownloadRoute());
  routes.use(getUploadRoute());
  routes.use(getConfigRoute());
  return routes;
};
