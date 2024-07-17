using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Quic;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Security.Cryptography;

namespace QuicServer
{
    class Server
    {
        private const int PORT = 1235;
        private const string NODEJS_BACKEND_URL = "http://localhost:1234";

        static async Task Main(string[] args)
        {
            if (!QuicListener.IsSupported)
            {
                Console.WriteLine("QUIC is not supported, check for presence of libmsquic and support of TLS 1.3.");
                return;
            }

            var serverConnectionOptions = new QuicServerConnectionOptions
            {
                // Used to abort stream if it's not properly closed by the user.
                // See https://www.rfc-editor.org/rfc/rfc9000#section-20.2
                DefaultStreamErrorCode = 0x0, // Protocol-dependent error code.

                // Used to close the connection if it's not done by the user.
                // See https://www.rfc-editor.org/rfc/rfc9000#section-20.2
                DefaultCloseErrorCode = 0x1, // Protocol-dependent error code.

                // Same options as for server side SslStream.
                ServerAuthenticationOptions = new SslServerAuthenticationOptions
                {
                    // List of supported application protocols, must be the same or subset of QuicListenerOptions.ApplicationProtocols.
                    ApplicationProtocols = new List<SslApplicationProtocol>() { new SslApplicationProtocol("h3") },
                    // Server certificate, it can also be provided via ServerCertificateContext or ServerCertificateSelectionCallback.
                    ServerCertificate = CreateSelfSignedCertificate()
                }
            };

            // Initialize, configure the listener and start listening.
            var listener = await QuicListener.ListenAsync(new QuicListenerOptions
            {
                // Listening endpoint, port 0 means any port.
                ListenEndPoint = new IPEndPoint(IPAddress.Loopback, PORT),
                // List of all supported application protocols by this listener.
                ApplicationProtocols = new List<SslApplicationProtocol>() { new SslApplicationProtocol("h3") },
                // Callback to provide options for the incoming connections, it gets called once per each connection.
                ConnectionOptionsCallback = (_, _, _) => ValueTask.FromResult(serverConnectionOptions)
            });
            Console.WriteLine($"QUIC server listening on port {PORT}");

            while (true)
            {
                var connection = await listener.AcceptConnectionAsync();
                _ = HandleConnectionAsync(connection);
            }
        }

        private static async Task HandleConnectionAsync(QuicConnection connection)
        {
            Console.WriteLine("Client connected.");

            try
            {
                while (true)
                {
                    var stream = await connection.AcceptInboundStreamAsync();
                    _ = HandleStreamAsync(stream);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error handling connection: {ex.Message}");
            }
        }

        private static async Task HandleStreamAsync(QuicStream stream)
        {
            var buffer = new byte[1024];
            var result = await stream.ReadAsync(buffer);
            var message = Encoding.UTF8.GetString(buffer, 0, result);

            try
            {
                var jsonDoc = JsonDocument.Parse(message);
                var root = jsonDoc.RootElement;

                if (root.TryGetProperty("action", out JsonElement actionElement))
                {
                    var action = actionElement.GetString();
                    switch (action)
                    {
                        case "upload":
                            await HandleUploadAsync(stream, root);
                            break;
                        case "download":
                            await HandleDownloadAsync(stream, root);
                            break;
                        case "handshake":
                            await SendResponse(stream, "{\"status\":\"ok\"}");
                            break;
                        default:
                            await SendErrorResponse(stream, "Unknown action");
                            break;
                    }
                }
                else
                {
                    await SendErrorResponse(stream, "No action provided");
                }
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"JSON parsing error: {ex.Message}");
                await SendErrorResponse(stream, "Invalid JSON format");
            }
        }

        private static async Task HandleUploadAsync(QuicStream stream, JsonElement root)
        {
            if (root.TryGetProperty("storage", out JsonElement storageElement) &&
                root.TryGetProperty("data", out JsonElement dataElement) &&
                root.TryGetProperty("token", out JsonElement tokenElement))
            {
                var storage = storageElement.GetString();
                var data = dataElement.GetString();
                var token = tokenElement.GetString();

                var headers = new Dictionary<string, string>
                {
                    { "Content-Type", "application/octet-stream" },
                    { "Authorization", $"Bearer {token}" }
                };

                try{
                    var response = await PostRequestAsync($"{NODEJS_BACKEND_URL}/api/quic/upload/{storage}", data, headers);
                    await SendResponse(stream, response);
                }catch(Exception ex){
                    await SendErrorResponse(stream, ex.Message);
                }
            }
            else
            {
                await SendErrorResponse(stream, "Invalid upload request");
            }
        }

        private static async Task HandleDownloadAsync(QuicStream stream, JsonElement root)
        {
            if (root.TryGetProperty("id", out JsonElement idElement) &&
                root.TryGetProperty("token", out JsonElement tokenElement))
            {
                var fileId = idElement.GetString();
                var token = tokenElement.GetString();

                var headers = new Dictionary<string, string>
                {
                    { "Authorization", $"Bearer {token}" }
                };

                var response = await GetRequestAsync($"{NODEJS_BACKEND_URL}/api/quic/download/{fileId}", headers);
                await SendResponse(stream, response);
            }
            else
            {
                await SendErrorResponse(stream, "Invalid download request");
            }
        }

        private static async Task<string> PostRequestAsync(string url, string data, Dictionary<string, string> headers)
        {
            HttpClient httpClient = new HttpClient();
            HttpRequestMessage  request = new HttpRequestMessage(HttpMethod.Post, url);
            var content_type = "application/octet-stream";

            foreach (var header in headers)
            {
                if (header.Key == "Content-Type"){
                    content_type = header.Value;
                }else{
                    request.Headers.Add(header.Key, header.Value);
                }
            }
            HttpContent content = new StringContent(data, Encoding.UTF8, content_type);
            request.Content = content;

            var response = await httpClient.SendAsync(request);
            return await response.Content.ReadAsStringAsync();
        }

        private static async Task<string> GetRequestAsync(string url, Dictionary<string, string> headers)
        {
            using var httpClient = new HttpClient();

            foreach (var header in headers)
            {
                httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
            }

            var response = await httpClient.GetAsync(url);
            return await response.Content.ReadAsStringAsync();
        }

        private static async Task SendResponse(QuicStream stream, string response)
        {
            var responseBytes = Encoding.UTF8.GetBytes(response);
            await stream.WriteAsync(responseBytes);
        }

        private static async Task SendErrorResponse(QuicStream stream, string errorMessage)
        {
            var errorResponse = new { status = "error", message = errorMessage };
            var errorResponseJson = JsonSerializer.Serialize(errorResponse);
            await SendResponse(stream, errorResponseJson);
        }
        private static X509Certificate2 CreateSelfSignedCertificate()
        {
            // var ecdsa = ECDsa.Create();
            // var certificateRequest = new CertificateRequest("CN=localhost", ecdsa, HashAlgorithmName.SHA256);
            var rsa = RSA.Create();
            var certificateRequest = new CertificateRequest("CN=localhost", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

            certificateRequest.CertificateExtensions.Add(
                new X509BasicConstraintsExtension(
                    certificateAuthority: false,
                    hasPathLengthConstraint: false,
                    pathLengthConstraint: 0,
                    critical: true
                )
            );
            certificateRequest.CertificateExtensions.Add(
                new X509KeyUsageExtension(
                    keyUsages:
                        X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment |
                        X509KeyUsageFlags.CrlSign | X509KeyUsageFlags.KeyCertSign,
                    critical: false
                )
            );
            certificateRequest.CertificateExtensions.Add(
                new X509EnhancedKeyUsageExtension(
                    new OidCollection {
                            new Oid("1.3.6.1.5.5.7.3.2"), // TLS Client auth
                            new Oid("1.3.6.1.5.5.7.3.1")  // TLS Server auth
                    },
                    false));

            certificateRequest.CertificateExtensions.Add(
                new X509SubjectKeyIdentifierExtension(
                    key: certificateRequest.PublicKey,
                    critical: false
                )
            );

            var sanBuilder = new SubjectAlternativeNameBuilder();
            sanBuilder.AddDnsName("localhost");
            certificateRequest.CertificateExtensions.Add(sanBuilder.Build());

            return certificateRequest.CreateSelfSigned(DateTimeOffset.Now.AddDays(-1), DateTimeOffset.Now.AddYears(5));
        }
    }

}
