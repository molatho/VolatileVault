import express from 'express';
import { getAuthRoute } from './auth';
import { getConfigRoute } from './config';

export const getRoutes = () => {
  const routes = express.Router();
  routes.use(getAuthRoute());
  routes.use(getConfigRoute());
  return routes;
};
