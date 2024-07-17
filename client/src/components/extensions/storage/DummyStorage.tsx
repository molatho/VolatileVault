import { ApiConfigResponse } from '../../../utils/Api';
import { ConfigFn, ConfigViewProps, StorageExtension } from '../Extension';

export class DummyStorage implements StorageExtension {
  get isConfigurable(): boolean {
    return true;
  }
  get name(): string {
    return 'dummystorage';
  }
  get displayName(): string {
    return 'Dummy Storage';
  }
  get description(): string {
    return "Non-functional dummy storage. This won't do anything and is only used for testing the frontend. It offers all capabilities Volatile Vault provides to storage extensions.";
  }

  isPresent(config: ApiConfigResponse): boolean {
    return true;
  }
  get configView(): ConfigFn {
    return (props: ConfigViewProps) => <>Dummy config view</>;
  }
}
