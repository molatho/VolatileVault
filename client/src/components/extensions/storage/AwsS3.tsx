import Api, {
  ExtensionItem,
  StorageTypes,
} from '../../../utils/Api';
import { BasicExtension, ConfigFn, StorageExtension } from '../Extension';
import { DummyStorage } from './DummyStorage';

export class AwsS3
  extends BasicExtension<StorageTypes>
  implements StorageExtension
{
  public static get extension_name(): string {
    return 'awss3';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BasicExtension<StorageTypes> {
    return new DummyStorage(api, cfg);
  }

  get isConfigurable(): boolean {
    return false;
  }

  get description(): string {
    const desc =
      'File storage on an AWS S3 bucket. Files are removed after a configurable amount of time.';

    if (this.cfg.description) return desc + ' ' + this.cfg.description;

    return desc;
  }

  get configView(): ConfigFn {
    throw new Error(`${this.name} is not configurable`);
  }
}
