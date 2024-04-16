import { Readable } from 'node:stream';
import { Extension } from '../extension';
import {  BaseStorage } from '../../config/config';

/**
 * Holds information about an uploaded item, can be extended by individual storage providers
 *
 * @export
 * @interface StorageInformation
 * @typedef {StorageInformation}
 */
export interface StorageInformation {
  id: string; // ID of a stored item
  creationDate?: Date; // Date of item creation, used for automated removal
}


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
  store(data: StorageData): Promise<StorageInformation>;
  retrieve(info: StorageInformation): Promise<StorageData>;
  remove(info: StorageInformation): Promise<void>;
}
