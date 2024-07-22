import Api, {
  ExtensionItem,
  StorageTypes,
} from '../../../utils/Api';
import { BasicExtension, ConfigFn, StorageExtension } from '../Extension';

export class FileSystem
  extends BasicExtension<StorageTypes>
  implements StorageExtension
{
  public static get extension_name(): string {
    return 'filesystem';
  }

  public static create(
    api: Api, cfg: ExtensionItem<any>
  ): BasicExtension<StorageTypes> {
    return new FileSystem(api, cfg);
  }

  get isConfigurable(): boolean {
    return false;
  }
  
  public get description(): string {
    const desc = 'File storage in the backed server. Files are removed after a configurable amount of time.';
    
    if (this.cfg.description)
      return desc + " " + this.cfg.description;
    
    return desc;    
  }

  get configView(): ConfigFn {
    throw new Error(`${this.name} is not configurable`);
  }
}
