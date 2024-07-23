declare class WebTransport {
    constructor(url: string);
    ready: Promise<void>;
    closed: Promise<void>;
    datagrams: {
      writable: WritableStream;
      readable: ReadableStream;
    };
  }
  