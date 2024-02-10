export const fromArrayBuffer = (data: ArrayBuffer) =>
  fromBuffer(new Uint8Array(data));

export const fromBuffer = (data: Buffer | Uint8Array) => {
  const frequencies = data.reduceRight(
    (freq, c) => freq.set(c, freq.has(c) ? (freq.get(c) as number) + 1 : 1),
    new Map<number, number>()
  );
  return Array.from(frequencies.values()).reduce(
    (sum, f) => sum - (f / data.byteLength) * Math.log2(f / data.byteLength),
    0
  );
};
