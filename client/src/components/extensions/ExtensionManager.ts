import Api, { ApiConfigResponse } from '../../utils/Api';
import Config from '../../utils/Config';
import { ExfilExtension, StorageExtension } from './Extension';
import { DummyExfil } from './exfil/DummyExfil';
import { BasicHttpExfil } from './exfil/BasicHttpExfil';
import { DummyStorage } from './storage/DummyStorage';
import { FileSystem } from './storage/FileSystem';
import { AwsCloudFrontExfil } from './exfil/AwsCloudFrontExfil';
import { AwsS3 } from './storage/AwsS3';
import { QuicExfil } from './exfil/quic/QuicExfil';

export function initializeExfilExtensions(
  api: Api,
  config: ApiConfigResponse
): ExfilExtension[] {
  if (Config.DEBUG)
    return [new BasicHttpExfil(api, config), new AwsCloudFrontExfil(api, config), new QuicExfil(api, config), new DummyExfil(api, config)];
  else return [new BasicHttpExfil(api, config), new AwsCloudFrontExfil(api, config), new QuicExfil(api, config)];
}

export function getStorages(): StorageExtension[] {
  if (Config.DEBUG) return [new FileSystem(), new AwsS3(), new DummyStorage()];
  else return [new FileSystem(), new AwsS3()];
}
