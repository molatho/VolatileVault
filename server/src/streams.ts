import { Readable } from 'stream';

export class MultiReadable extends Readable {
  private streams: Readable[];
  private currentStreamIndex: number;

  constructor(streams: Readable[]) {
    super();
    this.streams = streams;
    this.currentStreamIndex = 0;
  }

  _read() {
    if (this.currentStreamIndex >= this.streams.length) {
      this.push(null); // No more streams to read from
      return;
    }

    const currentStream = this.streams[this.currentStreamIndex];

    const onData = (chunk: any) => {
      if (!this.push(chunk)) {
        currentStream.pause();
      }
    };

    const onEnd = () => {
      currentStream.removeListener('data', onData);
      currentStream.removeListener('end', onEnd);
      this.currentStreamIndex++;
      this._read(); // Move to the next stream
    };

    currentStream.on('data', onData);
    currentStream.on('end', onEnd);

    currentStream.resume();
  }
}

export async function readFixedChunks(
  readable: Readable,
  chunkSize: number,
  onChunkCb: (chunk: Buffer, idx: number) => Promise<void>
): Promise<void> {
  let buffer = Buffer.alloc(0);
  let count = 0;
  let processing = false;  // Flag to indicate if a chunk is currently being processed
  const queue = [];  // Queue to hold pending chunks

  const processQueue = async () => {
    if (processing) return;  // If already processing, return early
    processing = true;  // Set the processing flag

    while (queue.length > 0) {
      const { chunk, index } = queue.shift();  // Dequeue the next chunk

      try {
        await onChunkCb(chunk, index);  // Process the chunk with the async callback
      } catch (error) {
        readable.destroy(error);  // If the callback fails, destroy the stream
        throw error;
      }
    }

    processing = false;  // Reset the processing flag
  };

  return new Promise((resolve, reject) => {
    readable.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= chunkSize) {
        const chunk = buffer.slice(0, chunkSize);  // Extract a chunk of the desired size
        queue.push({ chunk, index: count++ });  // Enqueue the chunk
        buffer = buffer.slice(chunkSize);  // Remove the extracted chunk from the buffer
      }
      processQueue().catch(reject);
    });

    readable.on('end', () => {
      if (buffer.length > 0) {
        queue.push({ chunk: buffer, index: count++ });  // Enqueue remaining data as the last chunk
      }
      processQueue().then(resolve).catch(reject);
    });

    readable.on('error', (err) => {
      reject(err);
    });
  });
}
