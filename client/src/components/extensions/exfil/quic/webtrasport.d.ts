interface WebTransportOptions {
  serverCertificateHashes?: Array<{ algorithm: string; value: ArrayBuffer }>;
}

declare class WebTransport {
  constructor(url: string, options?: WebTransportOptions);
  readonly ready: Promise<void>;
  readonly closed: Promise<void>;
  close(closeInfo?: { closeCode?: number; reason?: string }): void;
  createBidirectionalStream(): Promise<WebTransportBidirectionalStream>;
}
