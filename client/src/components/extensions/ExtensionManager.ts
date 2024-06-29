import Api, { ApiConfigResponse } from '../../utils/Api';
import { ExfilExtension } from './Extension';
import { DummyExfil } from './exfil/DummyExfil';
import { BasicHttpExfil } from './exfil/basichttp/BasicHttpExfil';

export function initializeExfilExtensions(
  api: Api,
  config: ApiConfigResponse
): ExfilExtension[] {
  return [new BasicHttpExfil(api, config), new DummyExfil(api, config)];
}
