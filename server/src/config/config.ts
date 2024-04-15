export interface Config {
  general: General
  storage: Storage
  exfil: Exfil
}

export interface General {
  port: number
  totp_secret: string
  jwt_expiry: number
}

export interface Storage {
  filesystem?: StorageFileSystem
}

export interface BaseStorage {
  file_expiry: number
  max_size: number
}

export interface StorageFileSystem extends BaseStorage{
  folder: string
}

export interface Exfil {
  basichttp?: ExfilBasicHTTP
}

export interface BaseExfil {
  single_size?: number
  chunk_size?: number
}

export interface ExfilBasicHTTP extends BaseExfil{
  hosts: string[]
}