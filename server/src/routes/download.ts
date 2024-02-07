import express, { Request, Response } from 'express';
import { FsUtils } from '../fs';
import { pipeline } from 'stream/promises';
import bodyParser from 'body-parser';

export const downloadRoute = express.Router();

interface FileRequestData {
    id?: string;
}


downloadRoute.use(bodyParser.json());

downloadRoute.get('/api/files/download/:id', async (req: Request, res: Response) => {
    var id = req.params?.id;
    if (!id)
        return res.status(400).send();

    try {
        var [stream, length] = await FsUtils.getFile(id);

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Length": length.toString()
        })

        for await (const data of stream)
            res.write(data, "binary");

        res.end();
    } catch (error) {
        res.status(400).json(error);
    }
});