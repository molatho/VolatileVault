#nullable enable

using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CommandLine;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Security.Cryptography.X509Certificates;


await Parser.Default.ParseArguments<RunOptions>(Environment.GetCommandLineArgs())
    .WithParsedAsync<RunOptions>(async o => await RunWebApp(o));

static IPAddress ParseResolveIp(string hostOrIp)
{
    IPAddress? address = null;
    if (IPAddress.TryParse(hostOrIp, out address))
        return address;

    var host = Dns.GetHostAddresses(hostOrIp);
    if (host.Length > 0)
        return host[0];

    throw new Exception($"Failed to resolve ${hostOrIp}!");
}

static Task RunWebApp(RunOptions quicOptions)
{
    var builder = WebApplication.CreateBuilder(Environment.GetCommandLineArgs());
    var address = ParseResolveIp(quicOptions.Host);

    // configure the ports
    builder.WebHost.ConfigureKestrel((context, options) =>
    {
        // check if the quicOptions.PfxFile exists
        if (!System.IO.File.Exists(quicOptions.PfxFile))
        {
            Console.WriteLine($"Pfx file {quicOptions.PfxFile} does not exist!");
            Environment.Exit(1);
        }
        else
        {
            Console.WriteLine($"Pfx file {quicOptions.PfxFile} found!");
        }

        // Load certificate and key from PEM files
        X509Certificate2 serverCertificate = null;
        try
        {
            serverCertificate = new X509Certificate2(quicOptions.PfxFile, quicOptions.PfxPass);
        }
        catch (Exception e)
        {
            Console.WriteLine($"Failed to load certificate: {e.Message}");
            Environment.Exit(1);
        }

        // webtransport configured port
        options.Listen(address, quicOptions.QuicPort, listenOptions =>
        {
            listenOptions.Protocols = HttpProtocols.Http3;
            listenOptions.UseHttps(quicOptions.PfxFile, quicOptions.PfxPass);
        });
    });

    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
    builder.Logging.SetMinimumLevel(LogLevel.Debug);

    var app = builder.Build();

    app.Use(async (context, next) =>
    {
        var feature = context.Features.GetRequiredFeature<IHttpWebTransportFeature>();
        if (!feature.IsWebTransportRequest)
        {
            Console.WriteLine($"WebTransport not present on connection from {context.Connection.RemoteIpAddress}:{context.Connection.RemotePort}");
            await next(context);
        }

        IWebTransportSession? session = null;
        try
        {
            session = await feature.AcceptAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
        }

        if (session is null)
        {
            return;
        }

        while (true)
        {
            ConnectionContext? stream = null;
            IStreamDirectionFeature? direction = null;
            // wait until we get a stream
            stream = await session.AcceptStreamAsync(CancellationToken.None);
            if (stream is not null)
            {
                Console.WriteLine($"Got WebTransport connection from {context.Connection.RemoteIpAddress}:{context.Connection.RemotePort}");
                direction = stream.Features.GetRequiredFeature<IStreamDirectionFeature>();
                if (direction.CanRead && direction.CanWrite)
                {
                    try
                    {
                        _ = handleBidirectionalStream(session, stream, quicOptions);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to handle bidirectional stream: {ex.Message}");
                        stream.Abort();
                        session.Abort(0x0101);
                        await stream.DisposeAsync();
                        break;
                    }
                }
                else
                {
                    // We'll only allow bidirectional streams ¯\_(ツ)_/¯
                    stream.Abort();
                    session.Abort(0x0101); // H3_GENERAL_PROTOCOL_ERROR: Peer violated protocol requirements in a way that does not match a more specific error code or endpoint declines to use the more specific error code.
                }
            }
        }
    });

    return app.RunAsync();
}

static async Task handleBidirectionalStream(IWebTransportSession session, ConnectionContext stream, RunOptions quicOptions)
{
    // TODO: Implement protocol:
    //      1) Receive & validate user's JWT
    //      2) Receive & validate no. of chunks to expect from the user
    //      3) Read as many chunks as specified
    //      4) Upload via `server` basichttp instance
    //      5) Respond to client with file ID

    var inputPipe = stream.Transport.Input;
    var outputPipe = stream.Transport.Output;

    // read some data from the stream into the memory
    var memory = new Memory<byte>(new byte[4096]);
    while (!stream.ConnectionClosed.IsCancellationRequested)
    {
        var length = await inputPipe.AsStream().ReadAsync(memory);
        var requestData = Encoding.UTF8.GetString(memory[..length].ToArray());
        var request = JsonSerializer.Deserialize<QuicRequest>(requestData)!;

        try
        {
            await ProcessMessage(request, stream, quicOptions);
        }
        catch (Exception ex)
        {
            var response = new QuicResponse() { Success = false, Message = ex.Message };
            await SendResponse(stream, response);
        }
    }
}

static async Task SendResponse<T>(ConnectionContext stream, T response) where T : QuicResponse
{
    var data = Encoding.UTF8.GetBytes(JsonSerializer.Serialize<T>(response));
    await stream.Transport.Output.AsStream().WriteAsync(data, 0, data.Length);
}

static async Task ProcessMessage(QuicRequest request, ConnectionContext stream, RunOptions quicOptions)
{
    if (!await IsAuthenticated(request.Token, quicOptions))
        throw new Exception("Authentication failure");

    await SendResponse(stream, new QuicResponse() { Success = true, Message = "Authentication successful" });

    switch (request.Action)
    {
        case "upload":
            var res = await HandleUpload(request, stream, quicOptions);
            await SendResponse(stream, new QuicResponseContainer<UploadResponse>()
            {
                Success = true,
                Message = "Upload finished",
                Data = res
            });
            break;
        //case "download":
        //    await HandleDownload(request, stream, quicOptions);
        //    break;
        default:
            throw new Exception($"Invalid action \"{request.Action}\"");
    }
}

static async Task HandleDownload(QuicRequest request, ConnectionContext stream, RunOptions quicOptions)
{
    throw new NotImplementedException();
}

static async Task<UploadResponse> HandleUpload(QuicRequest request, ConnectionContext stream, RunOptions quicOptions)
{
    if (request.UploadLength == null || request.UploadStorage == null)
        throw new Exception("Missing upload information");
    Console.WriteLine($"Uploading {request.UploadLength} bytes to {request.UploadStorage}...");

    using (var memstr = new MemoryStream(request.UploadLength.Value))
    {
        int read = 0;
        int totalRead = 0;
        byte[] buffer = new byte[4096];

        do
        {
            read = await stream.Transport.Input.AsStream().ReadAsync(buffer);
            totalRead += read;
            memstr.Write(buffer, 0, read);
        } while (read > 0 && totalRead < request.UploadLength!);

        using (var client = new HttpClient())
        {
            using (var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"http://{quicOptions.VVHost}:{quicOptions.VVPort}/api/{quicOptions.VVExt}/upload/{request.UploadStorage}"))
            {
                httpRequest.Headers.Add("Authorization", $"Bearer {request.Token}");
                memstr.Position = 0;
                httpRequest.Content = new StreamContent(memstr);
                httpRequest.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/octet-stream");
                using (var httpResponse = await client.SendAsync(httpRequest))
                {
                    httpResponse.EnsureSuccessStatusCode();
                    var res = await httpResponse.Content.ReadFromJsonAsync<UploadResponse>()!;
                    Console.WriteLine($"Upload done: {res!.ID}");
                    return res;
                }
            }
        }
    }
}

static async Task<bool> IsAuthenticated(string token, RunOptions quicOptions)
{

    using (var client = new HttpClient())
    {
        using (var request = new HttpRequestMessage(HttpMethod.Get, $"http://{quicOptions.VVHost}:{quicOptions.VVPort}/api/auth"))
        {
            request.Headers.Add("Authorization", $"Bearer {token}");
            using (var response = await client.SendAsync(request))
            {
                try
                {
                    response.EnsureSuccessStatusCode();
                    return true;
                }
                catch
                {
                    return false;
                }
            }
        }
    }
}


class QuicRequest
{
    [JsonPropertyName("token")]
    [JsonRequired]
    public string Token { get; set; }

    [JsonPropertyName("action")]
    [JsonRequired]
    public string Action { get; set; }

    [JsonPropertyName("upload_length")]
    public int? UploadLength { get; set; }

    [JsonPropertyName("upload_storage")]
    public string? UploadStorage { get; set; }

    [JsonPropertyName("download_id")]
    public string? DownloadId { get; set; }
}

class QuicResponse
{
    [JsonPropertyName("success")]
    [JsonRequired]
    public bool Success { get; set; }

    [JsonPropertyName("message")]
    [JsonRequired]
    public string Message { get; set; }
}

class QuicResponseContainer<T> : QuicResponse
{
    [JsonPropertyName("data")]
    [JsonRequired]
    public T Data { get; set; }
}

class UploadResponse
{
    [JsonPropertyName("message")]
    [JsonRequired]
    public string Message { get; set; }

    [JsonPropertyName("lifeTime")]
    [JsonRequired]
    public int LifeTime { get; set; }

    [JsonPropertyName("id")]
    [JsonRequired]
    public string ID { get; set; }
}

/// <summary>
/// Options for this extension's command line
/// </summary>
class RunOptions
{
    [Option("host", HelpText = "Host to bind the extension backend to", Required = true)]
    public string Host { get; set; }

    [Option("webport", HelpText = "Port to bind the web server to", Required = true)]
    public ushort WebPort { get; set; }

    [Option("pfxfile", HelpText = "path to the SSL private key file to use", Required = true)]
    public string PfxFile { get; set; }

    [Option("pfxpass", HelpText = "path to the SSL certificate key file to use", Required = true)]
    public string PfxPass { get; set; }

    [Option("quicport", HelpText = "Port to bind the quic endpoint to", Required = true)]
    public ushort QuicPort { get; set; }

    [Option("vvhost", HelpText = "Host of VolatileVault's internal basichttp instance", Required = true)]
    public string VVHost { get; set; }

    [Option("vvport", HelpText = "Port of VolatileVault's internal basichttp instance", Required = true)]
    public ushort VVPort { get; set; }

    [Option("vvext", HelpText = "Name of VolatileVault's internal basichttp instance", Required = true)]
    public string VVExt { get; set; }
}