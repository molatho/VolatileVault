import express, { Request, Response } from 'express';
import { ConfigInstance } from '../config/instance';

export const getConfigRoute = () => {
  const configRoute = express.Router();

  configRoute.get('/api/config', async (req: Request, res: Response) => {
    return res.status(201).json({
      message: 'Request successful',
      fileSize: ConfigInstance.Inst.upload.builtin.size, //TODO: Refactor structure to differentiate between upload types
    });
  });
  return configRoute;
};
