import express, { Request, Response } from 'express';

import config from '../config';

export const configRoute = express.Router();

configRoute.get('/api/config', async (req: Request, res: Response) => {
  return res.status(201).json({
    message: 'Request successful',
    fileSize: config.FILE_SIZE,
  });
});
