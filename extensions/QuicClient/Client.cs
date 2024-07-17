using System;
using System.Net.Quic;
using System.Net.Security;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace QuicClient
{
    class Client
    {
        private const string SERVER_ADDRESS = "172.24.235.198";
        private const int SERVER_PORT = 1235;
        private const string JWT_TOKEN = "";

        static async Task Main(string[] args)
        {
            if (!QuicConnection.IsSupported)
            {
                Console.WriteLine("QUIC is not supported, check for presence of libmsquic and support of TLS 1.3.");
                return;
            }

            IPAddress ip;
            IPAddress.TryParse(SERVER_ADDRESS, out ip);

            var clientOptions = new QuicClientConnectionOptions
            {
                RemoteEndPoint = new IPEndPoint(ip, SERVER_PORT),
                ClientAuthenticationOptions = new SslClientAuthenticationOptions
                {
                    TargetHost = SERVER_ADDRESS,
                    ApplicationProtocols = new System.Collections.Generic.List<SslApplicationProtocol> { new SslApplicationProtocol("h3") },
                    RemoteCertificateValidationCallback = (sender, certificate, chain, sslPolicyErrors) => true  // Ignore self-signed certificate errors
                },
                DefaultStreamErrorCode = 0x0,
                DefaultCloseErrorCode = 0x1
            };

            var isConnected = await TestServerAvailability(clientOptions);
            if (isConnected)
            {
                await StartMessagingLoop(clientOptions);
            }
        }

        private static async Task<bool> TestServerAvailability(QuicClientConnectionOptions clientOptions)
        {
            try
            {
                var connection = await QuicConnection.ConnectAsync(clientOptions);
                Console.WriteLine($"Connected {connection.LocalEndPoint} --> {connection.RemoteEndPoint}");

                var outgoingStream = await connection.OpenOutboundStreamAsync(QuicStreamType.Bidirectional);
                var handshakeMessage = new { action = "handshake" };
                await SendMessageInternal(outgoingStream, handshakeMessage);

                var response = await ReceiveMessage(outgoingStream);
                Console.WriteLine($"Received handshake response: {response}");

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to connect to the QUIC server: {ex.Message}");
            }

            return false;
        }

        private static async Task StartMessagingLoop(QuicClientConnectionOptions clientOptions)
        {
            while (true)
            {
                Console.WriteLine("Enter a message to send to the server:");
                var message = Console.ReadLine();
                if (!string.IsNullOrEmpty(message))
                {
                    await SendMessage(clientOptions, message);
                }
            }
        }

        private static async Task SendMessage(QuicClientConnectionOptions clientOptions, string message)
        {
            try
            {
                var connection = await QuicConnection.ConnectAsync(clientOptions);
                var outgoingStream = await connection.OpenOutboundStreamAsync(QuicStreamType.Bidirectional);
                
                var testMessage = new { action = "upload", storage = "filesystem", data = message, token = JWT_TOKEN };
                await SendMessageInternal(outgoingStream, testMessage);

                var response = await ReceiveMessage(outgoingStream);
                Console.WriteLine($"Received response: {response}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send message to the QUIC server: {ex.Message}");
            }
        }

        private static async Task SendMessageInternal(QuicStream stream, object message)
        {
            var messageJson = JsonSerializer.Serialize(message);
            var messageBytes = Encoding.UTF8.GetBytes(messageJson);
            await stream.WriteAsync(messageBytes);
        }

        private static async Task<string> ReceiveMessage(QuicStream stream)
        {
            var buffer = new byte[1024];
            var result = await stream.ReadAsync(buffer);
            return Encoding.UTF8.GetString(buffer, 0, result);
        }
    }
}
