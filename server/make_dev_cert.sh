#!/bin/bash

# Create request file
cat << EOF > cert.req
[req]
default_bits       = 256
default_md         = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
keyUsage = digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
EOF

# Create private key
openssl ecparam -name prime256v1 -genkey -noout -out cert.key

# Create certificate
openssl req -x509 -nodes -days 14 -key cert.key -out cert.pem -config cert.req -sha256

# Remove request file
rm cert.req