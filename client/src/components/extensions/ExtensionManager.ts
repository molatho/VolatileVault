import Api, { ApiConfigResponse } from '../../utils/Api';
import { ExfilExtension, StorageExtension } from './Extension';
import { DummyExfil } from './exfil/DummyExfil';
import { BasicHttpExfil } from './exfil/basichttp/BasicHttpExfil';
import { DummyStorage } from './storage/DummyStorage';
import { FileSystem } from './storage/FileSystem';

export function initializeExfilExtensions(
  api: Api,
  config: ApiConfigResponse
): ExfilExtension[] {
  return [new BasicHttpExfil(api, config), new DummyExfil(api, config)];
}

export function getStorages(): StorageExtension[] {
  return [new FileSystem(), new DummyStorage()];
}
