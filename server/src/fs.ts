import fsSync, { ReadStream } from 'fs';
import fs, { constants } from 'fs/promises';
import { Readable } from 'node:stream';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import { pipeline } from 'stream/promises';
import winston from 'winston';
import { Logger } from './logging';

export interface FileInfo {
  id: string;
  creationDate: Date;
}

interface FsDatabase {
  getFiles(): Promise<FileInfo[]>;
  getFile(id: string): Promise<FileInfo>;
  removeFile(id: string): Promise<void>;
  putFile(): Promise<FileInfo>;
}

const fileids = new ShortUniqueId({ length: 6, dictionary: 'alpha_upper' });

class InMemoryDatabase implements FsDatabase {
  private files: FileInfo[] = [];

  private static firstOrDefault<T>(items: T[]): T | null {
    return items?.length ? items[0] : null;
  }

  async getFiles(): Promise<FileInfo[]> {
    return this.files;
  }

  async getFile(id: string): Promise<FileInfo> {
    const file: FileInfo | null = InMemoryDatabase.firstOrDefault(
      this.files.filter((f) => f.id == id)
    );
    if (file === null) throw `File with id "${id}" not found!`;
    return file;
  }

  async removeFile(id: string): Promise<void> {
    try {
      const file = await this.getFile(id);
      this.files = this.files.filter((f) => f.id != id);
    } catch (error) {
      throw error;
    }
  }

  async putFile(): Promise<FileInfo> {
    const id = fileids.rnd();
    if (InMemoryDatabase.firstOrDefault(this.files.filter((f) => f.id == id)))
      throw `File with path "${path}" already exists!`;

    var _file = {
      id: id,
      creationDate: new Date(Date.now()),
    };
    this.files.push(_file);

    return _file;
  }
}

export class FsUtils {
  private db: FsDatabase = new InMemoryDatabase();
  private dir: string;
  private logger: winston.Logger;

  public constructor(name: string) {
    this.logger = Logger.Instance.createChildLogger(`FS:${name}`);
  }

  public async init(dir: string): Promise<void> {
    this.dir = path.resolve(dir);

    if (await this.exists(this.dir)) {
      this.logger.info(`Removing ${this.dir}`);
      await fs.rm(this.dir, { recursive: true, force: true });
    }
    this.logger.info(`Creating ${this.dir}`);
    await fs.mkdir(this.dir, { recursive: true });
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getFiles(): Promise<FileInfo[]> {
    return this.db.getFiles();
  }

  public async hasFile(id: string): Promise<boolean> {
    return await this.exists(path.join(this.dir, id));
  }

  public async getFile(id: string): Promise<[ReadStream, number]> {
    const _file: FileInfo | null = await this.db.getFile(id);
    const _path = path.join(this.dir, _file.id);
    if (!(await this.exists(_path))) throw `File "${_path}" does not exist!`;

    var stat = await fs.stat(_path);
    return [fsSync.createReadStream(_path, { flags: 'r' }), stat.size];
  }

  public async putFile(data: Readable): Promise<FileInfo> {
    this.logger.debug('Putting file...');
    const file = await this.db.putFile();
    this.logger.debug(`File: ${file.id}`);
    var str = fsSync.createWriteStream(path.join(this.dir, file.id), {
      flags: 'w',
      encoding: 'binary',
    });
    this.logger.debug(`Writing to ${str.path}...`);
    await pipeline(data, str);
    this.logger.debug('Done!');
    return file;
  }

  public async removeFile(id: string): Promise<void> {
    this.logger.debug(`Removing ${id} from db...`);
    await this.db.removeFile(id);
    this.logger.debug(`Removing ${id} from disk..`);
    fsSync.rmSync(path.join(this.dir, id));
  }

  public async cleanup(ageMs: number): Promise<void> {
    var now = new Date(Date.now());
    for (const file of await this.db.getFiles()) {
      if (now.getTime() - file.creationDate.getTime() >= ageMs) {
        this.logger.info(`Removing ${file.id}`);
        await fs.rm(path.join(this.dir, file.id), { force: true });
        await this.db.removeFile(file.id);
      }
    }
  }
}
