import { ApiConfigResponse } from '../../../utils/Api';
import { ConfigFn, StorageExtension } from '../Extension';

export class AwsS3 implements StorageExtension {
  get isConfigurable(): boolean {
    return false;
  }
  get name(): string {
    return 'awss3';
  }
  get displayName(): string {
    return 'AWS S3 Bucket';
  }
  get description(): string {
    return 'File storage on an AWS S3 bucket. Files are removed after a configurable amount of time.';
  }

  isPresent(config: ApiConfigResponse): boolean {
    return (
      config.storages.awss3 !== undefined &&
      config.storages.awss3 !== null
    );
  }
  get configView(): ConfigFn {
    throw new Error(`${this.name} is not configurable`);
  }
}
