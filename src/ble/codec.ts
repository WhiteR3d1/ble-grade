import { Buffer } from 'buffer';

// react-native-ble-plx sends and receives characteristic values as Base64 strings

export function encodeText(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

export function decodeText(base64: string | null): string {
  if (!base64) return '';
  const bytes = Buffer.from(base64, 'base64');
  // Some firmwares pad the value with NUL bytes, drop them
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  return bytes.toString('utf8', 0, end);
}

export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}
