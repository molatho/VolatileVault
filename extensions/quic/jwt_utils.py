import jwt
from jwt import PyJWKClient
import datetime

class JWTHandler:
    def __init__(self, public_key_path, private_key_path):
        with open(public_key_path, 'r') as f:
            self.public_key = f.read()
        with open(private_key_path, 'r') as f:
            self.private_key = f.read()

    def encode(self, payload):
        payload['exp'] = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        token = jwt.encode(payload, self.private_key, algorithm='RS512')
        return token

    def decode(self, token):
        try:
            decoded = jwt.decode(token, self.public_key, algorithms=['RS512'])
            return decoded
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

jwt_handler = JWTHandler('../server/public_key.pem', '../server/private_key.pem')