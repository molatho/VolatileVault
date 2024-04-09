import * as fs from 'fs';
import * as path from 'path';

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

  saveToFile(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const dataBuffer = this.getConcatenatedData();
      const filePath = path.join(__dirname, 'transfers', `${this.transferId}.bin`); // Change extension as needed
      fs.writeFile(filePath, dataBuffer, (err) => {
        if (err) {
          reject(`Failed to save data for transferId ${this.transferId}: ${err}`);
        } else {
          resolve();
        }
      });
    });
  }
}

class TransferManager {
  private transfers: Map<string, Transfer> = new Map();

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

  addChunkToTransfer(transferId: string, chunkIndex: number, data: Buffer): void {
    const transfer = this.getTransfer(transferId);
    transfer.addChunk(chunkIndex, data);
    if (transfer.isComplete()) {
      transfer.saveToFile().then(() => {
        console.log(`Transfer ${transferId} saved to file.`);
        this.transfers.delete(transferId); // Optionally remove the transfer after saving
      }).catch(console.error);
    }
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

setInterval(() => {
    transferManager.removeOldTransfers();
  }, 1 * 60 * 1000); // Run every minute

export const transferManager: TransferManager = new TransferManager();
