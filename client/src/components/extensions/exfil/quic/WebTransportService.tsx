// src/WebTransportService.ts

class WebTransportService {
  private url: string;
  private hash: string;
  private session: WebTransport | null;
  private stream: WebTransportBidirectionalStream | null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null;

  constructor(url: string, hash: string) {
    this.url = url;
    this.hash = hash;
    this.session = null;
    this.stream = null;
    this.reader = null;
    this.writer = null;
  }

  public async connect(): Promise<void> {
    this.session = new WebTransport(this.url, {
      // serverCertificateHashes: [
      //   {
      //     algorithm: 'sha-256',
      //     value: Uint8Array.from(atob(this.hash), (c) => c.charCodeAt(0)),
      //   },
      // ],
    });

    await this.session.ready;
    console.log('WebTransport connection established');

    this.stream = await this.session.createBidirectionalStream();
    this.reader = this.stream.readable.getReader();
    this.writer = this.stream.writable.getWriter();

    this.session.closed
      .then(() => {
        console.log('WebTransport connection closed');
      })
      .catch((error) => {
        throw new Error('WebTransport connection closed with error:', error);
      });
  }

  public async sendData(data: string): Promise<void> {
    const encoder = new TextEncoder();
    return await this.sendBinary(encoder.encode(data));
  }

  public async sendBinary(data: ArrayBuffer): Promise<void> {
    if (this.writer === null) {
      throw new Error('WebTransport connection is not ready');
    }

    await this.writer!.write(new Uint8Array(data));
  }

  public async receiveData(): Promise<Uint8Array> {
    if (this.reader === null) {
      throw new Error('WebTransport connection is not ready');
    }

    return new Promise<Uint8Array>(async (res, rej) => {
      try {
        var result: ReadableStreamReadResult<Uint8Array>;
        do {
          result = await this.reader!.read();
        } while (!result.done && (!result.value || !result.value.byteLength));

        res(result.value ?? new Uint8Array());
      } catch (err) {
        rej(err);
      }
    });
  }

  public async receiveString(): Promise<string> {
    const data = await this.receiveData();
    return new TextDecoder().decode(data);
  }

  public async disconnect(transport: WebTransport): Promise<void> {
    try {
      transport.close({
        closeCode: 0o17,
        reason: 'CloseButtonPressed',
      });
    } catch (err) {
      if (
        err instanceof WebTransportError &&
        err.name === 'InvalidStateError'
      ) {
        throw new Error('WebTransport is already closed:', err);
      } else {
        throw new Error(
          'WebTransport is in the process of connecting and cannot be closed'
        );
      }
    }
    try {
      await transport.closed;
      console.log(`The HTTP/3 connection closed gracefully.`);
    } catch (error) {
      throw new Error(`The HTTP/3 connection closed due to ${error}.`);
    }
  }

  public async waitForTransportClose(transport: WebTransport): Promise<void> {}
}

export default WebTransportService;
