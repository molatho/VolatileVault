import { Config } from '../config/config';

export interface ExtensionInfo {
  name: string;
  displayName: string;
  info: object;
}

export interface Extension<CAP extends string> {
  get name(): string;
  get capabilities(): CAP[];
  get clientConfig(): ExtensionInfo;

  supports(capability: CAP): boolean;

  init(cfg: Config): Promise<void>;

  /**
   * Allows extensions to install their own cron jobs
   *
   * @returns {Promise<void>}
   */
  installCron(): Promise<void>;
}

export abstract class BaseExtension<CAP extends string>
  implements Extension<CAP>
{
  public get name(): string {
    return this._name;
  }
  public get capabilities(): CAP[] {
    return this._capabilities;
  }

  private _name: string;
  private _capabilities: CAP[];
  protected cfg: Config;

  protected constructor(name: string, capabilities: CAP[]) {
    this._name = name;
    this._capabilities = capabilities;
  }

  abstract get clientConfig(): ExtensionInfo;

  public installCron(): Promise<void> {
    return Promise.resolve();
  }

  abstract init(cfg: Config): Promise<void>;

  supports(capability: CAP): boolean {
    return this._capabilities.indexOf(capability) !== -1;
  }

  protected abstract register();
}
