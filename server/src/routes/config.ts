import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { FsUtils } from '../fs';
import moment from 'moment';

import dotenv from 'dotenv';

dotenv.config();

export const configRoute = express.Router();

configRoute.get('/api/config', async (req: Request, res: Response) => {
  return res.status(201).json({
      message: 'Request successful',
      fileSize: parseInt(process.env.FILE_SIZE),
    });
});
