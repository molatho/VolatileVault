import express, { Request, Response } from 'express';

import config from '../config';
import bodyParser from 'body-parser';
import { AWSCustomService, DomainRegistrationResult } from '../cloud/aws';
import { transferManager } from 'src/transfermanager';

const crypto = require('crypto');

const cloudProvider = new AWSCustomService(config.AWS_ACCESS, config.AWS_SECRET, config.AWS_REGION);

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
    
    transferManager.createTransfer(transferId, amount);

    try {
        let promises = [];
        for (let i = 0; i < amount; i++) {
            // Push the promise into the promises array
            promises.push(cloudProvider.registerDomain(config.ORIGIN_DOMAIN, transferId+"-"+i));
        }

        // Wait for all promises to settle (either resolve or reject)
        Promise.allSettled(promises).then((results) => {
            var domains: DomainRegistrationResult[] = [];
            results.forEach((result: PromiseSettledResult<DomainRegistrationResult>) => {
                if (result.status === 'fulfilled') {
                    console.log(result.value);
                    domains.push(result.value);
                } else if (result.status === 'rejected') {
                    console.log(result.reason.message);
                }
            });
            if (domains.length === amount) {
                return res.status(201).json({
                    message: 'All domains are registered',
                    transferId: transferId,
                    domains: domains,
                });
            } else {
                for (let i = 0; i < domains.length; i++) {
                    cloudProvider.releaseDomain(domains[i].Id);
                }
                return res.status(404).json({
                    message: `ERROR: Only ${domains.length} domains were registered, therefore all domains were released.`,
                    transferId: transferId,
                    domains: domains,
                });
            }
        });
    } catch (error) {
        res.status(404).json(error);
    };

});

domainsRoute.get('/api/domains/release', async (req: Request, res: Response) => {
    const transferId = req.query?.transferId as string;
    if (!transferId) return res.status(404).send();
    
    try {
        let promises = [];
        let domains: DomainRegistrationResult[] = await cloudProvider.listDistributionsByOriginId(transferId);
        for (let i = 0; i < domains.length; i++) {
            promises.push(cloudProvider.releaseDomain(domains[i].Id));
        }

        Promise.allSettled(promises).then((results) => {
            results.forEach((result: PromiseSettledResult<DomainRegistrationResult>) => {
                if (result.status === 'fulfilled') {
                    console.log(result.value);
                } else if (result.status === 'rejected') {
                    console.log(result.reason.message);
                }
            });
            return res.status(200).json({
                message: 'All domains are released',
                transferId: transferId,
            });
        });
    } catch (error) {
        res.status(404).json(error);
    };
});

domainsRoute.get('/api/domains/status', async (req: Request, res: Response) => {
    const transferId = req.query?.transferId as string;
    if (!transferId) return res.status(404).send();
    
    // Check the status of each domain
    let statusPromises: Promise<boolean> = cloudProvider.areDistributionsReady(transferId);

    if (statusPromises){
        return res.status(200).json({
            success: true,
            message: "Deployed",
        });
    }
    else{
        return res.status(200).json({
            success: true,
            message: "InProgress",
        });
    }
});