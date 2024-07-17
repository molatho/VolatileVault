import express, { Request, Response } from 'express';
import { ExtensionRepository } from '../extensions/repository';

export const getConfigRoute = () => {
  const configRoute = express.Router();

  configRoute.get('/api/config', async (req: Request, res: Response) => {
    var storages = {}
    for (const storage of ExtensionRepository.getInstance().storages) {
      storages[storage.name] = storage.clientConfig;
    }
    var exfils = {}
    for (const exfil of ExtensionRepository.getInstance().exfils) {
      exfils[exfil.name] = exfil.clientConfig;
    }
    return res.status(201).json({
      message: 'Request successful',
      storages: storages,
      exfils: exfils
    });
  });
  return configRoute;
};
