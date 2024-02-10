import bytes from 'bytes';

export function calcSize(files: File[]): number {
  return files.reduce((n, file) => n + file.size, 0);
}

export function formatSize(size: number): string {
  return bytes.format(size, { decimalPlaces: 2 });
}
