<div align="center">
  <img width="125px" src="../../../../../client/public/logo192.png" />
  <h1>Volatile Vault - QUIC Extension</h1>
  <br/>
</div>

This extension leverages the QUIC protocol to exfiltrate data. To accomplish this, it spawns a [Kestrel](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel?view=aspnetcore-8.0) server that provides a QUIC interface. It can be run on Windows and Linux operating systems. The server is started automatically by the VolatileVault server if it's configured as an exfil.

## Setup

- Install dotnet > 7.0
- (If applicable) Install libmsquic and its dependencies ([ref](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/quic/quic-overview#platform-dependencies))
- Provide a trusted server certificate
  - You can convert certificate chains & private key files to PFX like so: `openssl pkcs12 -export -in cert_full.cer -inkey cert.key -out cert.pfx`
- Configure the associated [QUIC exfil](../../server/src/extensions/exfil/Quic/README.md).

## Renew certificate

```bash
# Point nginx quic SSL cert to generic HTTP cert path
sudo nano /etc/nginx/sites-enabled/default

# Shut down VV
docker compose -f docker-compose.prod.yml down

# Request new cert
sudo certbot --register-unsafely-without-email --agree-tos --nginx -d cloud.volatilevault.com

# Convert cert to be used with QUIC
cd /etc/letsencrypt/live/cloud.volatilevault.com/
openssl pkcs12 -export -in fullchain.pem -inkey privkey.pem -out cert.pfx
sudo cp /etc/letsencrypt/live/cloud.volatilevault.com/cert.pfx ~/VolatileVault/data/cert.pfx

# Stop NGINX
sudo systemctl disable nginx
sudo systemctl stop nginx

# Start VV
docker compose -f docker-compose.prod.yml up -d
```
