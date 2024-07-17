<div align="center">
  <img width="125px" src="client/public/logo192.png" />
  <h1>Volatile Vault</h1>
  <br/>

  <p><i>Volatile Vault is a secure data exfiltration & dropper platform for Red Team Operators by <a href="https://github.com/molatho">@molatho</a>.</i></p>
  <p><i>Inspired by <a href="https://github.com/sc0tfree/updog">updog</a>.</i></p>
  <br />
  
</div>

# Screenshots
<div align="center">
  <img width="400px" src="screenshots/screenshot1-select.png" />
  <img width="400px" src="screenshots/screenshot2-upload.png" />
  <img width="400px" src="screenshots/screenshot3-download.png"  />
</div>

# Use Cases

* **Data exfiltration**: Operators can upload sensitive files from compromised target systems to exfiltrate data securely, without any reliance on potentially untrustworthy third-parties.
* **Dropping implants**: Operators can upload implants from their machines and download them on target systems and leverage HTML smuggling to more covertly transmit and deploy their implants. 

# Features

* **Zero trust**: All data is encrypted/decrypted (using AES-GCM) and compressed/decompressed (ZIP DEFLATE) in the browser, no sensitive data hits the backend in plain text and no potentially sensitive key material ever leaves the browser.
* **Volatile storage**: All uploaded data has a preconfigured life-time (e.g. one hour) after which it gets deleted on the server side. Any previously stored encrypted blobs are removed on the server side upon startup of the server application.
* **TOTP authentication**: Access to the service is granted by using a shared secret for TOTP authentication, making it easy to use and more resilient to credential leakage.
* **Configurable**: Specifics such as the maximum allowed file size and life time of uploaded blobs can be configured using `.env` files before deployment of the application.
* **Chunks + HTTPS redirectors**: Upload the encrypted blobs in chunks via a range of HTTP redirectors pointing to the service.

## Roadmap

* **Rate limiting**: Limit the upload speed to the service so uploads won't be as easy to detect as bursts.
* **Password-encrypted Archives**: Encrypt the archives themselves so they can't be read in plain text on disk.
* **External blob storage**: Move encrypted blobs to some more scalable service such as S3.

## FAQs

Here are some Q&A's addressing Volatile Vault's shortcomings:

> Q: Can we have multiple users?

A: No. The declared goal of this app was to provide an easy-to-use and secure platform to exfiltrate data. It is meant to be used by small teams and for individual assessments, as part of your typical burner infrastructure, only.

> Q: Why does this use TOTP?

A: TOTP was chosen for its simplicity and implications for security: it's easy to set up (both parties only need to know the shared TOTP secret) and even if a SoC gets ahold of submitted tokens there's only a very brief time window in which they can re-use it.

> Q: Why do I need to enter the TOTP every time I open/refresh the page? Can't use our session after authenticating?

A: This application is not meant to be used over long time periods but only for exfiltrating data in select instances. Furthermore, by avoiding saving cookies or using localStorage, its footprint on the target system is reduced even further.

> Q: Why doesn't the server save the encrypted blobs on some cloud storage?

A: This feature is part of the roadmap and (once implemented) will be disabled by default as part of an effort to minimize distribution of the exfiltrated data.


# Installation

TBD

# Contributing

TBD

# Note

TBD