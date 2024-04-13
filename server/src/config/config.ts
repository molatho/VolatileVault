//import dotenv from 'dotenv';
//dotenv.config();

export default {
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT),
  FILE_EXPIRY: parseInt(process.env.FILE_EXPIRY),
  FILE_SIZE: parseInt(process.env.FILE_SIZE),
  FS_FOLDER: process.env.FS_FOLDER,
  JWT_EXPIRY: parseInt(process.env.JWT_EXPIRY),
  TOTP_SECRET: process.env.TOTP_SECRET,
};

export interface Config {
  general: General
  storage: Storage
  upload: Upload
}

export interface General {
  port: number
  totp_secret: string
  jwt_expiry: number
  file_expiry: number
}

export interface Storage {
  fs?: StorageFS
}

export interface StorageFS {
  folder: string
}

export interface Upload {
  builtin?: BuiltInUpload
}

export interface BuiltInUpload {
  size: number
  hosts: string[]
}