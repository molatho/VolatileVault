import { Readable } from 'node:stream';
import { Extension } from '../extension';
import express from 'express';
import { BaseExfil } from '../../config/config';

/**
 * Holds information about a stored item, can be extended by individual storage providers
 *
 * @export
 * @interface FileInformation
 * @typedef {FileInformation}
 */
export interface FileInformation {
  id: string; // ID of an uploaded item
}

export interface FileRetrievalInformation {
  id?: string; // ID of an uploaded item
  url?: string; // URL at which to download the uploaded item
}

/**
 * Enum that lets exfil providers declare their supported capabilities
 *
 * @export
 * @enum {number}
 */
export type ExfilProviderCapabilities =
  | 'None'
  | 'UploadSingle'
  | 'DownloadSingle'
  | 'UploadChunked'
  | 'DownloadChunked'
  | 'AddHost'
  | 'RemoveHost';

/**
 * Holds a binary stream and its length
 *
 * @export
 * @interface BinaryData
 * @typedef {BinaryData}
 */
export interface BinaryData {
  // TODO: same as server\src\storage\provider.ts:StorageData, define single central interface instead
  stream: Readable; // Stream to read binary contents from
  size: number; // Length of stream
}

/**
 * Basic interface for file upload/download
 *
 * @export
 * @interface ExfilProvider
 * @typedef {ExfilProvider}
 */
export interface ExfilProvider extends Extension<ExfilProviderCapabilities> {
  get hosts(): Promise<string[]>;
  get config(): BaseExfil;

  /**
   * Allows extensions to install their own routes
   *
   * @param {express.Express} app
   * @returns {Promise<void>}
   */
  installRoutes(app: express.Express): Promise<void>;

  // Simple up/downloads
  uploadSingle(
    storage: string,
    data: BinaryData
  ): Promise<FileRetrievalInformation>;
  downloadSingle(info: FileInformation): Promise<BinaryData>;

  // Chunked up/downloads
  initChunkUpload(storage: string, size: number): Promise<string>; // TODO: Define info type
  initChunkDownload(info: any): Promise<string>;
  uploadChunk(transferId: string, chunkNo: number, data: BinaryData): Promise<FileRetrievalInformation>;
  downloadChunk(transferId: string, chunkNo: number): Promise<BinaryData>;

  // Hosts management
  addHost(): Promise<string>;
  removeHost(host: string): Promise<void>;
}
