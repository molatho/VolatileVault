import {
  ExfilTypes,
  ExtensionItem,
  ExtensionTypes,
  StorageTypes,
} from '../config/config';
import { ExfilProviderCapabilities } from './exfil/provider';
import { StorageProviderCapabilities } from './storage/provider';

export type ExtensionState =
  | 'Uninitialized'
  | 'Initialized'
  | 'InitializationError'
  | 'Unconfigured';

export interface ExtensionInfo {
  name: string;
  type: string;
  display_name: string;
  description?: string;
  info: object;
}

export interface FileUploadInformation {
  id?: string; // ID of an uploaded item
  url?: string; // URL at which to download the uploaded item
  creationDate?: Date; // Time at which the item was uploaded
}

export interface Extension<CAP extends string> {
  get instance_name(): string;
  get capabilities(): CAP[];
  get clientConfig(): ExtensionInfo;
  get state(): ExtensionState;

  supports(capability: CAP): boolean;

  init(): Promise<void>;

  /**
   * Allows extensions to install their own cron jobs
   *
   * @returns {Promise<void>}
   */
  installCron(): Promise<void>;
}

export abstract class BaseExtension<
  CAP extends string,
  EXC extends ExtensionTypes
> implements Extension<CAP>
{
  public get instance_name(): string {
    return this._name;
  }
  public get capabilities(): CAP[] {
    return this._capabilities;
  }
  public get state(): ExtensionState {
    return this._state;
  }
  protected set state(val: ExtensionState) {
    this._state = val;
  }

  public get config(): EXC {
    return this.cfg.config;
  }

  private _name: string;
  private _state: ExtensionState = 'Uninitialized';
  private _capabilities: CAP[];
  protected cfg: ExtensionItem<EXC>;

  protected constructor(
    name: string,
    capabilities: CAP[],
    cfg: ExtensionItem<EXC>
  ) {
    this._name = name;
    this._capabilities = capabilities;
    this.cfg = cfg;
  }

  public static get extension_name(): string {
    throw new Error('Pure virtual call!');
  }

  public static create(
    item: ExtensionItem<any>
  ): BaseExtension<
    ExfilProviderCapabilities | StorageProviderCapabilities,
    ExfilTypes | StorageTypes
  > {
    throw new Error('Pure virtual call!');
  }

  abstract get clientConfig(): ExtensionInfo;

  public installCron(): Promise<void> {
    return Promise.resolve();
  }

  abstract init(): Promise<void>;

  supports(capability: CAP): boolean {
    return this._capabilities.indexOf(capability) !== -1;
  }

  protected abstract register();
}
