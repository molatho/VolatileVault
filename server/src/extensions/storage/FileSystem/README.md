<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - FileSystem Storage</h1>
  <br/>
</div>

This storage allows Volatile Vault to store files to and retrieve them from its harddrive.

# Configuration

Example:

```yaml
---
storage:
  - type: filesystem
    name: hotstorage
    display_name: Hot Storage
    description: Short term storage; files are removed after 5 minutes
    config:
      folder: './files_basic'
      max_size: 100
      file_expiry: 5
```

Fields:

- `folder`: Absolute or relative folder to store files in.
- `max_size`: Maximum allows size of files to store in MB.
- `file_expiry`: Duration (in minutes) after which files will be removed automatically.
