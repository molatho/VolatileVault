import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { FsUtils } from '../fs';
import config from '../config';

export const uploadRoute = express.Router();

uploadRoute.use(
  bodyParser.raw({ limit: config.FILE_SIZE, type: 'application/octet-stream' })
);

uploadRoute.use((error, req, res, next) => {
  if (error) {
    return res.status(413).json({ message: 'Data exceeds size limit' });
  }
  next(error);
});

uploadRoute.post('/api/files/upload', async (req: Request, res: Response) => {
  var body = req.body as Buffer;
  if (!body || !body.length) return res.status(400).send();

  try {
    var file = await FsUtils.putFile(Readable.from(body));
    return res.status(201).json({
      ...file,
      message: 'Upload successful',
      lifeTime: config.FILE_EXPIRY * 60,
    });
  } catch (error) {
    return res.status(400).json({ message: error?.message ?? 'Failure' });
  }
});
