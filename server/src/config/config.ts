export interface Config {
  general: General;
  storage: Storage;
  exfil: Exfil;
}

export interface General {
  port: number;
  totp_secret: string;
  jwt_expiry: number;
}

export interface Storage {
  filesystem?: StorageFileSystem;
  awss3?: StorageAwsS3;
}

export interface BaseStorage {
  file_expiry: number;
  max_size: number;
}

export interface StorageFileSystem extends BaseStorage {
  folder: string;
}

export interface StorageAwsS3 extends BaseStorage, BaseAwsSettings {}

export interface Exfil {
  basichttp?: ExfilBasicHTTP;
  awscloudfront?: ExfilAwsCloudFront;
  quic?: ExfilQuic;
}

export interface ExfilQuic extends BaseExfil {
  key: string;
  cert: string;
  port: number;
  hosts: string[];
}

export interface BaseExfil {
  single_size?: number;
  chunk_size?: number;
}

export interface ExfilBasicHTTP extends BaseExfil {
  hosts: string[];
}

export interface BaseAwsSettings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface ExfilAwsCloudFront extends BaseExfil, BaseAwsSettings {}
