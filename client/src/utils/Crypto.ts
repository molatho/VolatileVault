const makeKey = async (key: string): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    'raw',
    Buffer.from(key, 'utf-8'),
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
};

export const encryptSymmetric = async (
  plaintext: ArrayBuffer,
  key: string
): Promise<[ArrayBuffer, Uint8Array]> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const secretKey = await makeKey(key);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    secretKey,
    plaintext
  );

  return [ciphertext, iv];
};

export const decryptSymmetric = async (
  ciphertext: Buffer,
  iv: Buffer,
  key: string
): Promise<ArrayBuffer> => {
  const secretKey = await makeKey(key);

  const cleartext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    secretKey,
    ciphertext
  );
  return cleartext;
};
