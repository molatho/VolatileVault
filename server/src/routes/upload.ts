import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import { Readable } from 'node:stream';
import { FsUtils } from '../fs';
import config from '../config';
import { transferManager } from 'src/transfermanager';

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

uploadRoute.post('/api/files/upload/:transferId/chunk/:chunkId', async (req: Request, res: Response) => {
  var body = req.body as Buffer;
  if (!body || !body.length) return res.status(400).send();
  
  const transferId = req.params.transferId;
  const chunkId = req.params.chunkId ? parseInt(req.params.chunkId, 10) : null;
  const transfer = transferManager.getTransfer(transferId)
  
  transfer.addChunk(chunkId, body);
  if(transfer.isComplete()){
    transfer.saveToFile()
      .then(() => {
        console.log(`Transfer ${transferId} saved to file.`);
        transferManager.deleteTransfer(transferId);
        return res.status(201).json({
          success: true,
          message: 'File reassembled and stored',
          transferId: transferId,
          chunkId: chunkId,
        });
      })
      .catch(()=>{
        console.error(`Failed to save data for transferId ${transferId}`);
      });
  }
  else{
    return res.status(201).json({
      success: true,
      message: 'Chunk stored',
      transferId: transferId,
      chunkId: chunkId,
    });
  }

});
