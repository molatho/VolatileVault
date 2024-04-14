import { Readable } from 'node:stream';
import { Extension } from '../extensions/extension';
import express from 'express';

/**
 * Holds information about a stored item, can be extended by individual storage providers
 *
 * @export
 * @interface FileInformation
 * @typedef {FileInformation}
 */
export interface FileInformation {
  exfil: string; // Name of the provider used for upload/download
  id: string; // ID of an uploaded item
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
 * Used to register dynamic endpoint routes and communicate them to the frontend
 *
 * @export
 * @interface ExfilRoutes
 * @typedef {ExfilRoutes}
 */
export interface ExfilRoutes {
  upload?: string;
  download?: string;

  initChunkedUpload?: string;
  uploadChunk?: string;

  initChunkedDownload?: string;
  downloadChunk?: string;
}

/**
 * Basic interface for file upload/download
 *
 * @export
 * @interface ExfilProvider
 * @typedef {ExfilProvider}
 */
export interface ExfilProvider extends Extension<ExfilProviderCapabilities> {
  get routes(): ExfilRoutes;
  get hosts(): Promise<string[]>;
  
  
  /**
   * Allows extensions to install their own routes
   *
   * @param {express.Express} app
   * @returns {Promise<void>}
   */
  installRoutes(app: express.Express): Promise<void>;

  has(id: string): Promise<boolean>;

  uploadSingle(data: Readable): Promise<FileInformation>;
  downloadSingle(info: FileInformation): Promise<Readable>;

  initChunkUpload(info): string;

  uploadMulti(data: Readable): Promise<FileInformation>;
  downloadMulti(info: FileInformation): Readable;
}
