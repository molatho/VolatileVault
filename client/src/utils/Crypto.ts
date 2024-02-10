const makeKey = async (password: string): Promise<CryptoKey> => {
  const raw = new TextEncoder().encode(password);
  const key = new Uint8Array(32);
  if (raw.length < key.length)
    for (var i = 0; i < key.length; i++) key[i] = raw[i % raw.length]; // Pad key with repetitions of password

  return await crypto.subtle.importKey(
    'raw',
    key,
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
): Promise<[ArrayBuffer, ArrayBuffer]> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const secretKey = await makeKey(key);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    secretKey,
    plaintext
  );

  return [ciphertext, iv.buffer];
};

export const decryptSymmetric = async (
  ciphertext: ArrayBuffer,
  iv: ArrayBuffer,
  key: string
): Promise<ArrayBuffer> => {
  const secretKey = await makeKey(key);

  const cleartext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    secretKey,
    ciphertext
  );
  return cleartext;
};
