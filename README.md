<div align="center">
  <img width="125px" src="client/public/logo192.png" />
  <h1>Volatile Vault</h1>
  <br/>

  <p><i>Volatile Vault (V2) is a secure data exfiltration platform by <a href="https://github.com/molatho">@molatho</a>.</i></p>
  <br />
  
</div>

# Features

* **Zero trust**: All data is encrypted/decrypted (using AES-GCM) and compressed/decompressed (ZIP DEFLATE) in the browser, no sensitive data hits the backend in plain text.
* **Volatile storage**: All uploaded data has a preconfigured life-time (e.g. one hour) after which it gets deleted on the server side.
* **TOTP authentication**: Access to the service is granted by using a shared secret for TOTP authentication.

## Roadmap
* **Chunks + HTTPS redirectors**: Upload the encrypted blobs in chunks via a range of HTTP redirectors pointing to the service.
* **Rate limiting**: Limit the upload speed to the service so uploads won't be as easy to detect as bursts.
* **Password-encrypted Archives**: Encrypt the archives themselves so they can't be read in plain text on disk.
* **External blob storage**: Move encrypted blobs to some more scalable service such as S3. 

# Installation

TBD

# Contributing

TBD

# Note

TBD