
export default interface CloudProvider<T> {
    registerDomain(domainName: string, originId: string): Promise<T>;
    createStorage(storageName: string, region: string): Promise<T>;

    accessKeyId: string;
    secretAccessKey: string;
    storageObject: any;
    domainsObject: any;
}