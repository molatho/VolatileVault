import asyncio
import logging
import json
import requests
from aioquic.asyncio import serve
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import HandshakeCompleted, StreamDataReceived
from cert_utils import generate_self_signed_cert
from jwt_utils import jwt_handler

logging.basicConfig(level=logging.INFO)

NODEJS_BACKEND_URL = 'http://localhost:1234'  # URL of your Node.js server

class QuicServerProtocol(QuicConnectionProtocol):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    async def stream_handler(self, stream_id: int, data: bytes):
        try:
            message = json.loads(data.decode())
            token = message.get("token")
            if not token:
                response = {"status": "error", "message": "No token provided"}
                self._quic.send_stream_data(stream_id, json.dumps(response).encode())
                return

            payload = jwt_handler.decode(token)
            if not payload:
                response = {"status": "error", "message": "Invalid or expired token"}
                self._quic.send_stream_data(stream_id, json.dumps(response).encode())
                return
            
            action = message.get("action")
            if action == "upload":
                await self.handle_upload(stream_id, message)
            elif action == "download":
                await self.handle_download(stream_id, message)
            else:
                response = {"status": "error", "message": "Unknown action"}
                self._quic.send_stream_data(stream_id, json.dumps(response).encode())
        except Exception as e:
            logging.error(f"Error handling stream: {e}")
            response = {"status": "error", "message": str(e)}
            self._quic.send_stream_data(stream_id, json.dumps(response).encode())

    async def handle_upload(self, stream_id: int, message: dict):
        try:
            storage = message["storage"]
            data = message["data"].encode()

            headers = {
                'Content-Type': 'application/octet-stream',
                'Authorization': f"Bearer {message['token']}"
            }
            response = requests.post(
                f"{NODEJS_BACKEND_URL}/api/quic/upload/{storage}",
                data=data,
                headers=headers
            )
            response_data = response.json()
            self._quic.send_stream_data(stream_id, json.dumps(response_data).encode())
        except Exception as e:
            logging.error(f"Upload failed: {e}")
            response = {"status": "error", "message": "Upload failed"}
            self._quic.send_stream_data(stream_id, json.dumps(response).encode())

    async def handle_download(self, stream_id: int, message: dict):
        try:
            file_id = message["id"]
            headers = {
                'Authorization': f"Bearer {message['token']}"
            }
            response = requests.get(
                f"{NODEJS_BACKEND_URL}/api/quic/download/{file_id}",
                headers=headers,
                stream=True
            )
            if response.status_code == 200:
                for chunk in response.iter_content(chunk_size=8192):
                    self._quic.send_stream_data(stream_id, chunk)
            else:
                response_data = response.json()
                self._quic.send_stream_data(stream_id, json.dumps(response_data).encode())
        except Exception as e:
            logging.error(f"Download failed: {e}")
            response = {"status": "error", "message": "Download failed"}
            self._quic.send_stream_data(stream_id, json.dumps(response).encode())

    def quic_event_received(self, event):
        print(type(event).__name__)
        if isinstance(event, HandshakeCompleted):
            logging.info("Handshake completed with a client.")
        elif isinstance(event, StreamDataReceived):
            asyncio.ensure_future(self.stream_handler(event.stream_id, event.data))

async def main():
    # generate the certificate and key files using the code snippet from quic/cert_utils.py
    generate_self_signed_cert()
    host = "localhost"
    port = 1235

    configuration = QuicConfiguration(is_client=False)
    configuration.load_cert_chain(certfile="cert.pem", keyfile="key.pem")

    server = await serve(host, port, configuration=configuration, create_protocol=QuicServerProtocol)

    logging.info("QUIC server is running on {host}:{port}".format(host=host, port=port))

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logging.info("Server is shutting down...")
        server.close()
        await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
