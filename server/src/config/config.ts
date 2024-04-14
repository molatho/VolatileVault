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