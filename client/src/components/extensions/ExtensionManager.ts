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

export interface BaseExfilExtensionConstructor<T extends ExfilTypes> {
  extension_name: string;
  create(api: Api, cfg: ExtensionItem<any>): BaseExfilExtension<T>;
}

export function getExfils(): BaseExfilExtensionConstructor<ExfilTypes>[] {
  if (Config.DEBUG) return [BasicHttpExfil, AwsCloudFrontExfil, DummyExfil];
  else return [BasicHttpExfil, AwsCloudFrontExfil];
}

export interface BasicExtensionConstructor<T extends StorageTypes> {
  extension_name: string;
  create(api: Api, cfg: ExtensionItem<any>): BasicExtension<T>;
}

export function getStorages(): BasicExtensionConstructor<StorageTypes>[] {
  if (Config.DEBUG) return [FileSystem, AwsS3, DummyStorage];
  else return [FileSystem, AwsS3];
}
