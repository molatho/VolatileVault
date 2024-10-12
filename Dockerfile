# Build Client/Frontend
FROM node:18-alpine AS client

WORKDIR /usr/app/client/
COPY client/package*.json ./
RUN npm install -qy
COPY client/ ./
RUN rm ./.env
RUN npm run build

# Build QUIC extension
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS quic
WORKDIR /App
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

# VolatileVault Server/Backend
FROM node:18-bullseye

WORKDIR /usr/app/

RUN wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
RUN dpkg -i packages-microsoft-prod.deb && rm packages-microsoft-prod.deb
RUN apt update && apt install -y libmsquic aspnetcore-runtime-8.0

ENV DOTNET_ROOT=/usr/share/dotnet
ENV PATH=$PATH:/usr/share/dotnet

# Copy QUIC extension server binary
COPY --from=quic /App/out ./extensions/quic/bin/Debug/net8.0
RUN chmod +x ./extensions/quic/bin/Debug/net8.0/quic

WORKDIR /usr/app/server/

COPY server/package*.json ./
RUN npm install -qy
COPY server/ ./
COPY --from=client /usr/app/client/build/ ./public/

CMD ["npm", "start"]
