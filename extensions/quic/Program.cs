// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
#nullable enable

using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Connections.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using YamlDotNet.Serialization;



var content = File.ReadAllText("config.yaml");
var deserializer = new DeserializerBuilder()
            .Build();

var config = deserializer.Deserialize<Config>(content);

var basichttp = config.exfil.FirstOrDefault(e => e.type == "basichttp" && e.config.server != null);
if (basichttp == null) throw new Exception("No internal basichttp server found!");

var builder = WebApplication.CreateBuilder(args);

// generate a certificate and hash to be shared with the client
var certificate = GenerateManualCertificate();
var hash = SHA256.HashData(certificate.RawData);
var certStr = Convert.ToBase64String(hash);

// configure the ports
builder.WebHost.ConfigureKestrel((context, options) =>
{
    // website configured port
    options.Listen(IPAddress.Any, 5001, listenOptions =>
    {
        listenOptions.UseHttps();
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
    });
    // webtransport configured port
    options.Listen(IPAddress.Any, 5002, listenOptions =>
    {
        listenOptions.UseHttps(certificate);
        listenOptions.UseConnectionLogging();
        listenOptions.Protocols = HttpProtocols.Http1AndHttp2AndHttp3;
    });
});

var app = builder.Build();

// make index.html accessible
app.UseFileServer();

app.Use(async (context, next) =>
{
    // configure /certificate.js to inject the certificate hash
    if (context.Request.Path.Value?.Equals("/certificate.js") ?? false)
    {
        context.Response.ContentType = "application/javascript";
        await context.Response.WriteAsync($"var CERTIFICATE = '{certStr}';");
    }

    // configure the serverside application
    else
    {
        var feature = context.Features.GetRequiredFeature<IHttpWebTransportFeature>();
        if (!feature.IsWebTransportRequest)
        {
            await next(context);
        }

        var session = await feature.AcceptAsync(CancellationToken.None);

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
                direction = stream.Features.GetRequiredFeature<IStreamDirectionFeature>();
                if (direction.CanRead && direction.CanWrite)
                {
                    _ = handleBidirectionalStream(session, stream);
                }
                else
                {
                    // We'll only allow bidirectional streams ¯\_(ツ)_/¯
                    stream.Abort();
                    session.Abort(0x0101); // H3_GENERAL_PROTOCOL_ERROR: Peer violated protocol requirements in a way that does not match a more specific error code or endpoint declines to use the more specific error code.
                }
            }
        }
    }
});

await app.RunAsync();



static async Task handleBidirectionalStream(IWebTransportSession session, ConnectionContext stream)
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

        // slice to only keep the relevant parts of the memory
        var outputMemory = memory[..length];

        // do some operations on the contents of the data
        outputMemory.Span.Reverse();

        // write back the data to the stream
        await outputPipe.WriteAsync(outputMemory);

        memory.Span.Clear();
    }
}


// Adapted from: https://github.com/wegylexy/webtransport
// We will need to eventually merge this with existing Kestrel certificate generation
// tracked in issue #41762
static X509Certificate2 GenerateManualCertificate()
{
    X509Certificate2 cert;
    var store = new X509Store("KestrelSampleWebTransportCertificates", StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadWrite);
    if (store.Certificates.Count > 0)
    {
        cert = store.Certificates[^1];

        // rotate key after it expires
        if (DateTime.Parse(cert.GetExpirationDateString(), null) >= DateTimeOffset.UtcNow)
        {
            store.Close();
            return cert;
        }
    }
    // generate a new cert
    var now = DateTimeOffset.UtcNow;
    SubjectAlternativeNameBuilder sanBuilder = new();
    sanBuilder.AddDnsName("localhost");
    using var ec = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    CertificateRequest req = new("CN=localhost", ec, HashAlgorithmName.SHA256);
    // Adds purpose
    req.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension(new OidCollection
    {
        new("1.3.6.1.5.5.7.3.1") // serverAuth
    }, false));
    // Adds usage
    req.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature, false));
    // Adds subject alternate names
    req.CertificateExtensions.Add(sanBuilder.Build());
    // Sign
    using var crt = req.CreateSelfSigned(now, now.AddDays(14)); // 14 days is the max duration of a certificate for this
    cert = new(crt.Export(X509ContentType.Pfx));

    // Save
    store.Add(cert);
    store.Close();
    return cert;
}