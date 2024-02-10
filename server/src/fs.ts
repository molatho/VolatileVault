import { ReadStream } from 'fs';
import fs, { constants } from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import { pipeline } from 'stream/promises';
import { Readable } from 'node:stream';
import config from './config';

export interface FileInfo {
  id: string;
  creationDate: Date;
  path: string;
}

interface FsDatabase {
  getFiles(): Promise<FileInfo[]>;
  getFile(id: string): Promise<FileInfo>;
  removeFile(id: string): Promise<void>;
  putFile(path: string): Promise<FileInfo>;
}

const fileids = new ShortUniqueId({ length: 6, dictionary: 'alpha_upper' });
const pathids = new ShortUniqueId({ length: 10 });

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

  async putFile(path: string): Promise<FileInfo> {
    if (
      InMemoryDatabase.firstOrDefault(this.files.filter((f) => f.path == path))
    )
      throw `File with path "${path}" already exists!`;

    var _file = {
      path: path,
      id: fileids.rnd(),
      creationDate: new Date(Date.now()),
    };
    this.files.push(_file);

    return _file;
  }
}

export class FsUtils {
  private static db: FsDatabase = new InMemoryDatabase();

  private static get dir() {
    return path.resolve(config.FS_FOLDER);
  }

  public static async init(): Promise<void> {
    if (await FsUtils.exists(FsUtils.dir))
      await fs.rm(FsUtils.dir, { recursive: true, force: true });

    await fs.mkdir(FsUtils.dir);
  }

  private static async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path, constants.R_OK | constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  public static async getFiles(): Promise<FileInfo[]> {
    return FsUtils.db.getFiles();
  }

  public static async getFile(id: string): Promise<[ReadStream, number]> {
    const _file: FileInfo | null = await FsUtils.db.getFile(id);
    const _path = path.join(FsUtils.dir, _file.path);
    if (!(await FsUtils.exists(_path))) throw `File "${_path}" does not exist!`;

    var stat = await fs.stat(_path);
    return [
      fsSync.createReadStream(_path, { flags: 'r', encoding: 'binary' }),
      stat.size,
    ];
  }

  public static async putFile(data: Readable): Promise<FileInfo> {
    const file = await FsUtils.db.putFile(pathids.rnd());
    var str = fsSync.createWriteStream(path.join(FsUtils.dir, file.path), {
      flags: 'w',
      encoding: 'binary',
    });
    await pipeline(data, str);
    return file;
  }

  public static async removeFile(id: string): Promise<void> {
    return await FsUtils.db.removeFile(id);
  }

  public static async cleanup(ageMs: number): Promise<void> {
    var now = new Date(Date.now());
    for (const file of await FsUtils.db.getFiles()) {
      if (now.getTime() - file.creationDate.getTime() >= ageMs) {
        console.log(`Removing ${file.id} (${file.path})`);
        await fs.rm(path.join(FsUtils.dir, file.path), { force: true });
        await FsUtils.db.removeFile(file.id);
      }
    }
  }
}
