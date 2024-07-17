import { ApiConfigResponse } from '../../../utils/Api';
import { ConfigFn, StorageExtension } from '../Extension';

export class FileSystem implements StorageExtension {
  get isConfigurable(): boolean {
    return false;
  }
  get name(): string {
    return 'filesystem';
  }
  get displayName(): string {
    return 'Built-in Filesystem';
  }
  get description(): string {
    return 'File storage in the backed server. Files are removed after a configurable amount of time.';
  }

  isPresent(config: ApiConfigResponse): boolean {
    return (
      config.storages.filesystem !== undefined &&
      config.storages.filesystem !== null
    );
  }
  get configView(): ConfigFn {
    throw new Error(`${this.name} is not configurable`);
  }
}
