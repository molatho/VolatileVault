interface CloudProvider {
    registerDomain(domainName: string, originId: string): Promise<string>;
    createStorage(storageName: string, region: string): Promise<void>;

    accessKeyId: string;
    secretAccessKey: string;
    storageObject: any;
    domainsObject: any;
}