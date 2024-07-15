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
