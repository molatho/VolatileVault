import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { FsUtils } from '../fs';

export const uploadRoute = express.Router();

uploadRoute.use(
  bodyParser.raw({ limit: '100mb', type: 'application/octet-stream' })
);

uploadRoute.post('/api/files/upload', async (req: Request, res: Response) => {
  var body = req.body as Buffer;
  if (!body || !body.length) return res.status(400).send();

  try {
    var file = await FsUtils.putFile(Readable.from(body));
    return res.status(201).json(file);
  } catch (error) {
    return res.status(400).json(error);
  }
});
