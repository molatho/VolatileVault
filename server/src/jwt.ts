import { expressjwt } from 'express-jwt';
import { generateKeyPairSync } from 'crypto';
const fs = require('fs');

export class Keys {
  private static instance: Keys = null;
  private privKey: string;
  private pubKey: string;
  public get privateKey() {
    return this.privKey;
  }
  public get publicKey() {
    return this.pubKey;
  }

  private constructor() {
    const res = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    this.privKey = res.privateKey;
    this.pubKey = res.publicKey;

    // Store the keys on disk
    fs.writeFileSync('private_key.pem', res.privateKey);
    fs.writeFileSync('public_key.pem', res.publicKey);
  }

  public static getInstance(): Keys {
    if (Keys.instance == null) {
      Keys.instance = new Keys();
    }
    return Keys.instance;
  }
}

const keysInstance = Keys.getInstance();

export const jwt = expressjwt({
  secret: Keys.getInstance().publicKey,
  algorithms: ['RS512'],
});
