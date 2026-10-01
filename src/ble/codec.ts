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

// "SGk=" -> "48 69"
export function toHex(base64: string | null): string {
  if (!base64) return '';
  return Array.from(Buffer.from(base64, 'base64'), (byte) => byte.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
}

// False for binary data such as a battery level byte or sensor readings
export function isReadableText(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isControl = code < 0x20 && char !== '\n' && char !== '\r' && char !== '\t';
    if (isControl || code === 0xfffd) return false;
  }
  return true;
}

export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}
