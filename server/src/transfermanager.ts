import * as fs from 'fs';
import * as path from 'path';
import cron from 'node-cron';
import { FsUtils } from './fs';
import { Readable } from 'stream';

class Chunk {
  constructor(public chunkIndex: number, public data: Buffer) {}
}

class Transfer {
  private chunks: Map<number, Chunk> = new Map();
  private concatenatedData?: Buffer;

  constructor(public transferId: string, public totalChunks: number, public updateAt: Date) {}

  addChunk(chunkIndex: number, data: Buffer): void {
    if (this.chunks.has(chunkIndex)) {
      throw new Error(`Chunk index ${chunkIndex} already added.`);
    }
    this.chunks.set(chunkIndex, new Chunk(chunkIndex, data));
  }

  isComplete(): boolean {
    return this.chunks.size === this.totalChunks;
  }

  getConcatenatedData(): Buffer {
    if (!this.concatenatedData) {
      if (!this.isComplete()) {
        throw new Error('Transfer is not complete.');
      }
      const sortedChunks = Array.from(this.chunks.values()).sort((a, b) => a.chunkIndex - b.chunkIndex);
      this.concatenatedData = Buffer.concat(sortedChunks.map((chunk) => chunk.data));
    }
    return this.concatenatedData;
  }
}

class TransferManager {
  private transfers: Map<string, Transfer> = new Map();
  cachedDomains: Array<string> = ["d4i8k1hm0219u.cloudfront.net", "d1y8kfijfy1afj.cloudfront.net"];

  createTransfer(transferId: string, totalChunks: number): Transfer {
    if (this.transfers.has(transferId)) {
      throw new Error(`Transfer with ID ${transferId} already exists.`);
    }
    const transfer = new Transfer(transferId, totalChunks, new Date());
    this.transfers.set(transferId, transfer);
    return transfer;
  }

  getTransfer(transferId: string): Transfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) {
      throw new Error(`Transfer with ID ${transferId} does not exist.`);
    }
    return transfer;
  }

  deleteTransfer(transferId: string): boolean {
    return this.transfers.delete(transferId);
  }

  removeOldTransfers(): void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes in milliseconds
    this.transfers.forEach((transfer, transferId) => {
      if (transfer.updateAt < fiveMinutesAgo) {
        this.transfers.delete(transferId);
        console.log(`Transfer with ID ${transferId} has been removed due to age.`);
      }
    });
  }
}

// Run the cleanup task every minute
cron.schedule('* * * * *', () => {
  transferManager.removeOldTransfers();
});

export const transferManager: TransferManager = new TransferManager();
