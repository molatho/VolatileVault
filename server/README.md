<div align="center">
  <img width="125px" src="../client/public/logo192.png" />
  <h1>Volatile Vault - Server</h1>
  <br/>
</div>

To little surprise, the server is the central and arguably most important component of Volatile Vault. While it does its best to not do anything stupid, it requires you to configure it properly.

# Concept

Volatile Vault allows you to mix and match plugins for file storages ("storages") and exfiltration mechanisms ("exfils") to your heart's content. Storages are plugins that store and retrieve files - this could be the server's filesystem or a cloud storage such as AWS S3. Exfils are data transports that allow you to upload and download files to and from Volatile Vault - this could be a simple built-in HTTP transport or an entirely different protocol such as QUIC.

You can specify which storages and exfils to use by configuring them in (or ommitting them from) your server's configuration.

# Configuration

Volatile Vault uses YAML files for configuration. The server expects to find a `config.yaml` file in its root directory and will refuse to start up if it's missing or invalid. You can find a template [here](config.example.yaml).

The config consists of three major parts:

* **general**: The general configuration of the server, including the port its API is reachable on.
* **storage**: Configurations for individual storages.
* **exfil**: Configurations for individual exfils.

Please refer to the individual plugins' README files for more details on their exact configuration:
* Storages
  * [filesystem](src/extensions/storage/FileSystem/README.md)
  * [awss3](src/extensions/storage/AwsS3/README.md)
* Exfils
  * [basichttp](src/extensions/exfil/BasicHttp/README.md)
  * [awscloudfront](src/extensions/exfil/AwsCloudFront/README.md)

At this time there can only be a single instance of each plugin active and configured at a time. This means that you can for example configure both basichttp and awscloudfront exfils, but you can not configure to use two instances of basichttp.