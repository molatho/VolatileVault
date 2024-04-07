import express, { Request, Response } from 'express';

import config from '../config';
import bodyParser from 'body-parser';
import { AWSCustomService } from '../cloud/aws';
const crypto = require('crypto');

export const domainsRoute = express.Router();
domainsRoute.use(bodyParser.json());

domainsRoute.get('/api/domains', async (req: Request, res: Response) => {
  return res.status(201).json({
    message: 'Request successful',
    fileSize: config.FILE_SIZE,
  });
});
  
domainsRoute.get('/api/domains/register', async (req: Request, res: Response) => {
    const amountParam = req.query?.chunksCount as string;
    const amount: number = amountParam ? parseInt(amountParam, 10) : null;
    const transferId = crypto.randomBytes(16).toString('hex');

    if (amount === null || isNaN(amount)) return res.status(404).send();

    var cloudProvider = new AWSCustomService(config.AWS_ACCESS, config.AWS_SECRET, config.AWS_REGION);
    
    try {
        let promises = [];
        for (let i = 0; i < amount; i++) {
            // Push the promise into the promises array
            promises.push(cloudProvider.registerDomain(config.ORIGIN_DOMAIN, transferId+"-"+i));
        }

        // Wait for all promises to settle (either resolve or reject)
        Promise.allSettled(promises).then((results) => {
            var domains = [];
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    console.log(result.value);
                    domains.push(result.value);
                } else if (result.status === 'rejected') {
                    console.log(result.reason.message);
                }
            });
            return res.status(201).json({
                message: 'Request successful',
                transferId: transferId,
                domains: domains,
              });
        });
    } catch (error) {
        res.status(404).json(error);
    }
});