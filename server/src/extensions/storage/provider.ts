import { Readable } from 'node:stream';
import { Extension, FileUploadInformation } from '../extension';
import {  BaseStorage } from '../../config/config';


/**
 * Holds a binary stream and its length
 *
 * @export
 * @interface StorageData
 * @typedef {StorageData}
 */
export interface StorageData {
    stream: Readable; // Stream to read binary contents from
    size: number; // Length of stream
}

/**
 * Enum that lets storage providers declare their supported capabilities
 *
 * @export
 * @enum {number}
 */
export type StorageProviderCapabilities = 'None' | 'Reserved' | 'Remove';

/**
 * Basic interface for file storage/retrieval
 *
 * @export
 * @interface StorageProvider
 * @typedef {StorageProvider}
 */
export interface StorageProvider
  extends Extension<StorageProviderCapabilities> {
  get config() : BaseStorage;
  has(id: string): Promise<boolean>;
  store(data: StorageData): Promise<FileUploadInformation>;
  retrieve(info: FileUploadInformation): Promise<StorageData>;
  remove(info: FileUploadInformation): Promise<void>;
}
