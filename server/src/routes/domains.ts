import express, { Request, Response } from 'express';

import config from '../config';
import bodyParser from 'body-parser';
import { AWSCustomService } from 'src/cloud/aws';

export const configRoute = express.Router();
configRoute.use(bodyParser.json());

configRoute.get('/api/domains', async (req: Request, res: Response) => {
  return res.status(201).json({
    message: 'Request successful',
    fileSize: config.FILE_SIZE,
  });
});

interface FileRequestData {
    id?: string;
  }
  
  
  
configRoute.get('/api/domains/register', async (req: Request, res: Response) => {
    async (req: Request, res: Response) => {
        var amountParam: string = req.params?.chunksCount;
        const amount: number = amountParam ? parseInt(amountParam, 10) : null;

        if (amount === null || isNaN(amount)) return res.status(404).send();

        var cloudProvider = new AWSCustomService(config.AWS_ACCESS, config.AWS_SECRET, config.AWS_REGION);
        
        try {
            for (let i = 0; i < amount; i++) {
                cloudProvider
                    .registerDomain(config.ORIGIN_DOMAIN)
                    .then((data) => {
                        console.log(data);
                        res.write(data);
                    })
                    .catch((err) => {
                        console.log(err.message);
                    });
            }
            res.end();
        } catch (error) {
            res.status(404).json(error);
        }
    }
});