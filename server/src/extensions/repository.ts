import { ExfilProvider } from './exfil/provider';
import { StorageProvider } from './storage/provider';

export class ExtensionRepository {
  private static instance: ExtensionRepository | null = null;

  private _storages: Map<string, StorageProvider>;
  private _exfils: Map<string, ExfilProvider>;

  public get storages(): StorageProvider[] {
    return Array.from(this._storages.values());
  }
  public get exfils(): ExfilProvider[] {
    return Array.from(this._exfils.values());
  }

  private constructor() {
    this._storages = new Map<string, StorageProvider>();
    this._exfils = new Map<string, ExfilProvider>();
  }

  public static getInstance(): ExtensionRepository {
    if (ExtensionRepository.instance == null) {
      ExtensionRepository.instance = new ExtensionRepository();
    }

    return ExtensionRepository.instance;
  }

  public registerStorage(storage: StorageProvider): void {
    if (this._storages.has(storage.instance_name))
      throw new Error(`Storage "${storage.instance_name}" already registered!`);
 
    this._storages.set(storage.instance_name, storage);
  }

  public getStorage(name: string): StorageProvider {
    if (!this._storages.has(name))
      throw new Error(`Storage "${name}" not registered!`);

    return this._storages.get(name);
  }

  public async getStorageForFile(id: string): Promise<StorageProvider> {
    for (const storage of ExtensionRepository.getInstance().storages) {
      if (await storage.has(id)) return storage;
    }
    throw new Error('Unknown file');
  }

  public registerExfil(exfil: ExfilProvider): void {
    if (this._exfils.has(exfil.instance_name))
      throw new Error(`Exfil "${exfil.instance_name}" already registered!`);

    this._exfils.set(exfil.instance_name, exfil);
  }

  public getExfil(name: string): ExfilProvider {
    if (!this._exfils.has(name))
      throw new Error(`Exfil "${name}" not registered!`);

    return this._exfils.get(name);
  }
}
