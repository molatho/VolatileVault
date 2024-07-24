// src/WebTransportService.ts

class WebTransportService {
  private url: string;
  private transport: WebTransport | null;

  constructor(url: string) {
    this.url = url;
    this.transport = null;
  }

  public async connect(): Promise<void> {
    this.transport = new WebTransport(this.url, {
      serverCertificateHashes: [
        {
          algorithm: 'sha-256',
          value: Uint8Array.from(
            atob('tMFLlgJGlw4HAKkfqbGdMMREkV92bxQmqcblalKqyEs='), //TODO: Obtain dynamically from backend
            (c) => c.charCodeAt(0)
          ),
        },
      ],
    });

    try {
      await this.transport.ready;
      console.log('WebTransport connection established');
    } catch (error) {
      console.error('Failed to establish WebTransport connection:', error);
      return;
    }

    this.transport.closed
      .then(() => {
        console.log('WebTransport connection closed');
      })
      .catch((error) => {
        console.error('WebTransport connection closed with error:', error);
      });
  }

  public async sendData(data: string): Promise<void> {
    const encoder = new TextEncoder();
    return await this.sendBinary(encoder.encode(data));
  }

  public async sendBinary(data: ArrayBuffer): Promise<void> {
    if (!this.transport || !this.transport.ready) {
      throw new Error('WebTransport connection is not ready');
    }

    const writable = this.transport.datagrams.writable.getWriter();
    await writable.write(data);
    writable.releaseLock();
  }

  public async receiveData(): Promise<string> {
    if (!this.transport || !this.transport.ready) {
      throw new Error('WebTransport connection is not ready');
    }

    const reader = this.transport.datagrams.readable.getReader();

    return new Promise<string>(async (res, rej) => {
      var data = '';
      try {
        while (true) {
          const { value, done } = await reader.read();

          const decoder = new TextDecoder();
          data += decoder.decode(value);

          if (done) {
            res(data);
          }
        }
      } catch (err) {
        rej(err);
      }
    });
  }
}

export default WebTransportService;
