import express, { Request, Response } from 'express';
import { ExtensionRepository } from '../extensions/repository';

export const getConfigRoute = () => {
  const configRoute = express.Router();

  configRoute.get('/api/config', async (req: Request, res: Response) => {
    var storages = {}
    for (const storage of ExtensionRepository.getInstance().storages) {
      storages[storage.instance_name] = storage.clientConfig;
    }
    var exfils = {}
    for (const exfil of ExtensionRepository.getInstance().exfils) {
      exfils[exfil.instance_name] = exfil.clientConfig;
    }
    return res.status(201).json({
      message: 'Request successful',
      storages: ExtensionRepository.getInstance().storages.map(s=>s.clientConfig),
      exfils: ExtensionRepository.getInstance().exfils.map(e=>e.clientConfig)
    });
  });
  return configRoute;
};
