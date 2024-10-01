<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - BasicHttp Exfil</h1>
  <br/>
</div>

This exfil allows Volatile Vault to upload files to and download them from the very same backend where its API is running on.

# Configuration

Example:

```yaml
---
exfil:
  basichttp:
    max_total_size: 100
    hosts:
      - 'https://my.cool.site'
```

Fields:

- `max_total_size`: Maximum allowed size of a single data transfer (upload or download) in MB.
- `hosts`: (Optional) List of hosts the frontend may use to proxy data transfers through.
