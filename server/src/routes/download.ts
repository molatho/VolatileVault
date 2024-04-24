import express, { Request, Response } from 'express';
import { FsUtils } from '../fs';
import bodyParser from 'body-parser';
import https from 'https';
import config from '../config';
import { transferManager } from '../transferManager';

export const downloadRoute = express.Router();

downloadRoute.use(bodyParser.json());

downloadRoute.get('/api/files/download/:id',
  async (req: Request, res: Response) => {
    var id = req.params?.id;
    if (!id) return res.status(404).send();

    try {
      if (config.USE_CLOUDSTORAGE) {
        const downloadUrl = transferManager.fileStorage.get(id);
        const data: Buffer = await downloadBinaryFile(downloadUrl)

        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Length': data.length.toString(),
          });
          res.write(data, 'binary');
          res.end();
      }
      else{
        var [stream, length] = await FsUtils.getFile(id);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': length.toString(),
        });
  
        for await (const data of stream) res.write(data, 'binary');
  
        res.end();
      }
    } catch (error) {
      res.status(404).json(error);
    }
  }
);

async function downloadBinaryFile(url: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // Start the request
    const request = https.get(url, (response) => {
      // Handle non-success status codes
      if (response.statusCode !== 200) {
        reject(new Error(`Request failed with status code: ${response.statusCode}`));
        return;
      }

      // Array to hold the chunks of data
      const chunks: Uint8Array[] = [];

      // Listen for data events to receive chunks of data
      response.on('data', (chunk: Uint8Array) => {
        chunks.push(chunk);
      });

      // Once all the data has been received, concatenate the chunks and resolve
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Handle request errors
    request.on('error', (error) => {
      reject(new Error(error.message));
      return;
    });
  });
}