import { CHAR_UUID, SERVICE_UUID } from './constants';
import { sameUuid, type GattCharacteristic } from './model';

// Standard Bluetooth UUIDs are 0000xxxx-0000-1000-8000-00805f9b34fb
const BASE_UUID_SUFFIX = '-0000-1000-8000-00805f9b34fb';

// A few common standard services and characteristics, by their 16-bit id
const KNOWN_NAMES: Record<string, string> = {
  '1800': 'Generic Access',
  '1801': 'Generic Attribute',
  '180a': 'Device Information',
  '180f': 'Battery',
  '2a00': 'Device Name',
  '2a01': 'Appearance',
  '2a05': 'Service Changed',
  '2a19': 'Battery Level',
  '2a24': 'Model Number',
  '2a29': 'Manufacturer Name',
};

// Human name for a service or characteristic UUID, or null for unknown custom ones
export function gattName(uuid: string): string | null {
  if (sameUuid(uuid, SERVICE_UUID)) return 'Assignment service';
  if (sameUuid(uuid, CHAR_UUID)) return 'Assignment characteristic';

  const lower = uuid.toLowerCase();
  if (!lower.startsWith('0000') || !lower.endsWith(BASE_UUID_SUFFIX)) return null;
  const shortId = lower.slice(4, 8);
  return KNOWN_NAMES[shortId] ?? `0x${shortId.toUpperCase()}`;
}

export function describeProperties(characteristic: GattCharacteristic): string {
  const parts = [
    characteristic.canRead && 'Read',
    characteristic.canWrite && (characteristic.writeWithResponse ? 'Write' : 'Write without response'),
    characteristic.canNotify && 'Notify',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'No read or write';
}
