import asyncio
import json
from dataclasses import dataclass, field
import ssl
from typing import Optional, cast
from enum import Flag
from aioquic.asyncio import connect
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import HandshakeCompleted, StreamDataReceived
from jwt_utils import jwt_handler  # Import the JWTHandler class

class Result(Flag):
    V = 0x000001
    H = 0x000002
    D = 0x000004
    C = 0x000008
    R = 0x000010
    Z = 0x000020
    S = 0x000040
    Q = 0x000080

    M = 0x000100
    B = 0x000200
    A = 0x000400
    U = 0x000800
    P = 0x001000
    E = 0x002000
    L = 0x004000
    T = 0x008000

    three = 0x010000
    d = 0x020000
    p = 0x040000

    def __str__(self):
        flags = sorted(
            map(
                lambda x: getattr(Result, x),
                filter(lambda x: not x.startswith("_"), dir(Result)),
            ),
            key=lambda x: x.value,
        )
        result_str = ""
        for flag in flags:
            if self & flag:
                result_str += flag.name
            else:
                result_str += "-"
        return result_str
    
@dataclass
class Server:
    name: str
    host: str
    port: int = 4433
    http3: bool = True
    http3_port: Optional[int] = None
    retry_port: Optional[int] = 4434
    path: str = "/"
    push_path: Optional[str] = None
    result: Result = field(default_factory=lambda: Result(0))
    session_resumption_port: Optional[int] = None
    structured_logging: bool = False
    throughput_path: Optional[str] = "/%(size)d"
    verify_mode: Optional[int] = None

class QuicClientProtocol(QuicConnectionProtocol):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.received_data = asyncio.Queue()
        self.stream_id = None
        
    def quic_event_received(self, event):
        if isinstance(event, HandshakeCompleted):
            print("Handshake completed!")
        elif isinstance(event, StreamDataReceived):
            print("Received:", event.data.decode())
            self.received_data.put_nowait(event.data.decode())
            # Respond on the same stream
            self._quic.send_stream_data(event.stream_id, b"Received: " + event.data)

    async def send_message(self, message: str):
        if self.stream_id is None:
            self.stream_id = self._quic.get_next_available_stream_id()
        token = jwt_handler.encode({"user_id": 123})
        message_payload = json.dumps({"action": "upload", "token": token, "storage": "inmemory", "data": message}).encode()
        self._quic.send_stream_data(self.stream_id, message_payload)
        print(f"Message sent on stream {self.stream_id}")

async def test_handshake_and_close(server: Server, configuration: QuicConfiguration):
    async with connect(
        server.host, server.port, configuration=configuration
    ) as protocol:
        await protocol.ping()
        server.result |= Result.H
    server.result |= Result.C
    print("test_handshake_and_close completed with {result}".format(result=server.result))

async def main():
    host = "localhost"
    port = 1235
    server = Server(name="local host", host=host, port=port, verify_mode=ssl.CERT_NONE)

    configuration = QuicConfiguration(is_client=True)
    configuration.load_verify_locations(cafile="cert.pem")

    print(f"Testing {server.name}...")
    await test_handshake_and_close(server, configuration)
    
    print(f"Establishing connection to {server.name}...")
    async with connect(
        server.host, server.port, configuration=configuration, create_protocol=QuicClientProtocol
    ) as protocol:
        while True:
            choice = input("Enter '1' to run test_handshake_and_close, '2' to run send_message, or 'q' to quit: ")
            if choice == '1':
                await test_handshake_and_close(server, configuration)
            elif choice == '2':
                message = input("Enter the message to send: ")
                await protocol.send_message(message)
            elif choice == 'q':
                break
            else:
                print("Invalid choice. Please enter '1', '2', or 'q'.")
    

if __name__ == "__main__":
    asyncio.run(main())