import express, { Request, Response } from 'express';

import config from '../config';
import bodyParser from 'body-parser';
import { cloudProvider, DomainRegistrationResult } from '../cloud/aws';
import { transferManager } from '../transferManager';
import { GetDistributionResult } from '@aws-sdk/client-cloudfront';

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
    const amount: number = amountParam ? parseInt(amountParam, 10) : 0;
    
    if (!amount || isNaN(amount)) {
        return res.status(400).send('Invalid amount parameter.');
    }
    
    const transferId = await transferManager.createTransfer(amount);

    if(config.USE_CLOUDSTORAGE)
        cloudProvider.createStorage(transferId, config.AWS_REGION);

    if (config.DEBUG && transferManager.cachedDomains.length >= amount) {
        console.log("DEBUG: Using cached domains");
        return res.status(201).json({
            message: 'All domains are registered',
            transferId: transferId,
            domains: transferManager.cachedDomains.slice(0, amount),
        });
    }

    try {
        let promises: Promise<GetDistributionResult>[] = [];
        for (let i = 0; i < amount; i++) {
            promises.push(cloudProvider.registerDomain(config.ORIGIN_DOMAIN, `${transferId}-${i}`));
        }

        const results = await Promise.allSettled(promises);
        const domains: GetDistributionResult[] = [];

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                console.log(`${result.value.Distribution?.Id} - ${result.value.Distribution?.DomainName}`);
                domains.push(result.value);
            } else if (result.status === 'rejected') {
                console.error(result.reason);
            }
        });

        if (domains.length === amount && domains.length > 0) {
            //get all DomainNames from string array "domains" and store them here in a variable
            var domainNames: string[] = domains.map(domain => domain.Distribution.DomainName ? domain.Distribution.DomainName : "");

            transferManager.getTransfer(transferId).domains = domains;

            return res.status(201).json({
                message: 'All domains are registered',
                transferId: transferId,
                domains: domainNames,
            });
        } else {
            domains.forEach((domain) => {
                cloudProvider.releaseDomain(domain.Distribution.Id);
            });
            return res.status(500).json({
                message: `ERROR: Only ${domains.length} out of ${amount} domains were registered. All domains were released.`,
                transferId: transferId,
                domains: domains,
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'An error occurred while registering domains.',
            error: error.message || error,
        });
    }
});

domainsRoute.get('/api/domains/release', async (req: Request, res: Response) => {
    const transferId = req.query?.transferId as string;
    if (!transferId) return res.status(404).send();
    
    try {
        let promises = [];
        cloudProvider.listDistributionsByTransferId(transferId).then((domains: DomainRegistrationResult[]) => {
            domains.forEach((domain: DomainRegistrationResult) => {
                promises.push(cloudProvider.releaseDomain(domain.Id));
            });
        });

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
    
    if (config.DEBUG)
        return res.status(200).json({success: true,status: "Deployed"});
    
    // Check the status of each domain
    try{
        const status = await cloudProvider.areDistributionsReady(transferId)
        if (status === true){
            return res.status(200).json({
                success: true,
                status: "Deployed",
            });
        } else
            return res.status(423).json({
                success: true,
                status: "InProgress",
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    };
});