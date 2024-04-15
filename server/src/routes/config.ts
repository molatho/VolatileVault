import express, { Request, Response } from 'express';
import { ExtensionRepository } from '../extensions/repository';

export const getConfigRoute = () => {
  const configRoute = express.Router();

  configRoute.get('/api/config', async (req: Request, res: Response) => {
    return res.status(201).json({
      message: 'Request successful',
      storages: ExtensionRepository.getInstance().storages.map(s=>s.clientConfig),
      exfils: ExtensionRepository.getInstance().exfils.map(s=>s.clientConfig)
    });
  });
  return configRoute;
};
