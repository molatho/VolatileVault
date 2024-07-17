// src/WebTransportService.ts

class WebTransportService {
    private url: string;
    private transport: WebTransport | null;
  
    constructor(url: string) {
      this.url = url;
      this.transport = null;
    }
  
    public async connect(): Promise<void> {
      this.transport = new WebTransport(this.url);
  
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
      if (!this.transport || !this.transport.ready) {
        console.error('WebTransport connection is not ready');
        return;
      }
  
      const encoder = new TextEncoder();
      const writable = this.transport.datagrams.writable.getWriter();
      await writable.write(encoder.encode(data));
      writable.releaseLock();
    }
  
    public async receiveData(callback: (data: string) => void): Promise<void> {
      if (!this.transport || !this.transport.ready) {
        console.error('WebTransport connection is not ready');
        return;
      }
  
      const reader = this.transport.datagrams.readable.getReader();
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
  
        const decoder = new TextDecoder();
        callback(decoder.decode(value));
      }
    }
  }
  
  export default WebTransportService;
  