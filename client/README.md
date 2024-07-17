<div align="center">
  <img width="125px" src="public/logo192.png" />
  <h1>Volatile Vault - Client</h1>
  <br/>
</div>

The Volatile Vault client lets users interface with its powerful backend. It's designed to be simple and simple to use.

# Configuration

The frontend is not very much configurable by itself as it queries information about enabled & configured storages and exfils from the [server](../server/README.md) at runtime.

It can be configured by editing its `.env` file. You can find a template [here](.env.sample).

```env
REACT_APP_BASE_URL=http://localhost:8888
DEBUG=true
```

Fields:

- `REACT_APP_BASE_URL`: Base URL of the API. Useful for debugging when the API and frontend aren't served by the same webserver.
- `DEBUG`: Enables more verbose logging and the inclusion of "Dummy" storages and exfils. Useful for testing specific configurations at runtime.
