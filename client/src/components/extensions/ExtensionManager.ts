import Api, {
  ExfilTypes,
  ExtensionItem,
  ExtensionTypes,
  StorageTypes,
} from '../../utils/Api';
import Config from '../../utils/Config';
import {
  BaseExfilExtension,
  BasicExtension,
} from './Extension';
import { DummyExfil } from './exfil/DummyExfil';
import { BasicHttpExfil } from './exfil/BasicHttpExfil';
import { DummyStorage } from './storage/DummyStorage';
import { FileSystem } from './storage/FileSystem';
import { AwsCloudFrontExfil } from './exfil/AwsCloudFrontExfil';
import { AwsS3 } from './storage/AwsS3';
import { QuicExfil } from './exfil/quic/QuicExfil';

export interface BaseExfilExtensionConstructor<T extends ExtensionTypes> {
  extension_name: string;
  create(api: Api, cfg: ExtensionItem<any>): BaseExfilExtension<ExfilTypes>;
}

export function getExfils(): BaseExfilExtensionConstructor<ExfilTypes>[] {
  if (Config.DEBUG) return [BasicHttpExfil, AwsCloudFrontExfil, DummyExfil, QuicExfil];
  else return [BasicHttpExfil, AwsCloudFrontExfil, QuicExfil];
}

export interface BasicExtensionConstructor<T extends StorageTypes> {
  extension_name: string;
  create(api: Api, cfg: ExtensionItem<any>): BasicExtension<StorageTypes>;
}

export function getStorages(): BasicExtensionConstructor<StorageTypes>[] {
  if (Config.DEBUG) return [FileSystem, AwsS3, DummyStorage];
  else return [FileSystem, AwsS3];
}
