export type StorageTypes = StorageFileSystem | StorageAwsS3;
export type ExfilTypes = ExfilBasicHTTP | ExfilAwsCloudFront | ExfilQuic;
export type ExtensionTypes = StorageTypes | ExfilTypes;

export interface Config {
  general: General;
  storage: ExtensionItem<StorageTypes>[];
  exfil: ExtensionItem<ExfilTypes>[];
}

export interface General {
  host: string;
  port: number;
  totp_secret: string;
  jwt_expiry: number;
  ssl?: SslCert;
}

export interface SslCert {
  key_file: string;
  cert_file: string;
}

export interface ExtensionItem<T> {
  type: string;
  name: string;
  display_name: string;
  description?: string;
  config: T;
}

export interface BaseStorage {
  file_expiry: number;
  max_size: number;
}

export interface StorageFileSystem extends BaseStorage {
  folder: string;
}

export interface BaseExfil {
  max_total_size?: number;
  chunk_size?: number;
}

export interface ServerInfo {
  host: string;
  port: number;
}

export interface ExfilBasicHTTPServer extends ServerInfo {
}

export interface ExfilBasicHTTP extends BaseExfil {
  hosts: string[];
  server?: ExfilBasicHTTPServer;
}

export interface BaseAwsSettings {
  access_key_id: string;
  secret_access_key: string;
  region: string;
}

export type TransferMode = 'Dynamic' | 'Static';

export interface TransferConfig {
  mode: TransferMode;
  hosts?: string[];
  max_dynamic_hosts?: number;
  max_duration: number;
}

export interface ExfilAwsCloudFront extends BaseExfil, BaseAwsSettings {
  distribution_tag: string;
  domain: string;
  folder: string;
  upload: TransferConfig;
  download: TransferConfig;
}

export interface StorageAwsS3 extends BaseStorage, BaseAwsSettings {
  bucket: string;
  generate_presigned_urls: boolean;
  user_arn: string;
}

export interface ExfilQuic extends BaseExfil {
  bindInterface: ServerInfo;
  hosts: string[];
  serverBinary: string;
  serverDirectory: string;
}