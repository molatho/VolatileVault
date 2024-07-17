import { expressjwt } from 'express-jwt';
import { generateKeyPairSync } from 'crypto';

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

  public static getInstance(): Keys {
    if (Keys.instance != null) return Keys.instance;
    Keys.instance = new Keys();
    
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
    Keys.instance.privKey = res.privateKey;
    Keys.instance.pubKey = res.publicKey;

    return Keys.instance;
  }
}

export const jwt = expressjwt({
  secret: Keys.getInstance().publicKey,
  algorithms: ['RS512'],
});
