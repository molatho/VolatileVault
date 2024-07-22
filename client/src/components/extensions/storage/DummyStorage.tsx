import Api, {
  ExtensionItem,
  StorageTypes,
} from '../../../utils/Api';
import {
  BasicExtension,
  ConfigFn,
  ConfigViewProps,
  StorageExtension,
} from '../Extension';

export class DummyStorage
  extends BasicExtension<StorageTypes>
  implements StorageExtension
{
  public static get extension_name(): string {
    return 'dummystorage';
  }

  public static create(
    api: Api,
    cfg: ExtensionItem<any>
  ): BasicExtension<StorageTypes> {
    return new DummyStorage(api, cfg);
  }

  get isConfigurable(): boolean {
    return true;
  }

  public get description(): string {
    const desc =
      "Non-functional dummy storage. This won't do anything and is only used for testing the frontend. It offers all capabilities Volatile Vault provides to storage extensions.";

    if (this.cfg.description) return desc + ' ' + this.cfg.description;

    return desc;
  }
  get configView(): ConfigFn {
    return (props: ConfigViewProps) => <>Dummy config view</>;
  }
}
