FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /App
COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
# Add the MS repo to install `libmsquic` to support DNS-over-QUIC:
ADD --link https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb /
RUN <<HEREDOC
  dpkg -i packages-microsoft-prod.deb && rm packages-microsoft-prod.deb
  apt update && apt install -y libmsquic
  apt clean -y && rm -rf /var/lib/apt/lists/*
HEREDOC

WORKDIR /App
COPY --from=build-env /App/out .
ENTRYPOINT ["dotnet", "quic.dll"]