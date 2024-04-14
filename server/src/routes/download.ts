import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

export const getDownloadRoute = () => {
  const downloadRoute = express.Router();

  interface FileRequestData {
    id?: string;
  }

  downloadRoute.use(bodyParser.json());

  downloadRoute.get(
    '/api/files/download/:id',
    async (req: Request, res: Response) => {
      var id = req.params?.id;
      if (!id) return res.status(404).send();

      try {
        var [stream, length] = [null, 0];//await FsUtils.getFile(id); //TODO: de-couple endpoint from storage

        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': length.toString(),
        });

        for await (const data of stream) res.write(data, 'binary');

        res.end();
      } catch (error) {
        res.status(404).json(error);
      }
    }
  );

  return downloadRoute;
};
