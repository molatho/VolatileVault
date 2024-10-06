<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - BasicHttp Exfil</h1>
  <br/>
</div>

This exfil allows Volatile Vault to upload files to and download them via the [QUIC](https://en.wikipedia.org/wiki/QUIC) protocol. The QUIC server logic is implemented in the [QUIC extension server](../../../../../extensions/quic/README.md).

# Configuration

Example:

```yaml
---
exfil:
  - type: quic
    name: quic
    display_name: HTTP/3 & QUIC
    description: Connects to a separate QUIC server which proxies uploads to an internal basichttp instance.
    config:
      bindInterface:
        host: 0.0.0.0
        port: 5002
      hosts:
        - 'https://cloud.volatilevault.com:5002'
      serverBinary: 'quic'
      serverDirectory: '../extensions/quic/bin/Debug/net8.0'
      ssl:
        pfx_file: '/path/to/cert.pfx'
        pfx_pass: '<changeme>'

```

Fields:

- `bindInterface`: Defines the IP and port the QUIC extension server shall bind to
- `hosts`: List of hosts the frontend may use to proxy data transfers through.
- `serverBinary`: Binary of the QUIC exentsion server to start.
- `serverDirectory`: Directory that contains the `serverBinary`.
- `ssl`: Path to the PFX file (and its password) to use for transport encryption.
  - Note: You can convert full_chain/private_key files to PFX using openssl like so: `openssl pkcs12 -export -in cert_full.cer -inkey cert.key -out cert.pfx`
