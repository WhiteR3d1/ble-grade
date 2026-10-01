import { Buffer } from 'buffer';

import { decodeText, encodeText } from './codec';
import { CHAR_UUID, SERVICE_UUID } from './constants';
import { bleFailure } from './errors';
import {
  isAssignmentCharacteristic,
  type Advertisement,
  type BleTransport,
  type GattCharacteristic,
} from './model';

// Browsers can't use react-native-ble-plx, so the web preview talks to simulated devices.
// The "instructor device" behaves like the real one:
// "Enter your name" -> write a name -> "<name> - Your grade is X."
// Real Bluetooth only works in the Android app.

type SimulatedDevice = {
  advertisement: Advertisement;
  characteristics: GattCharacteristic[];
};

const standardUuid = (shortId: string) => `0000${shortId}-0000-1000-8000-00805f9b34fb`;
const DEVICE_NAME = { serviceUUID: standardUuid('1800'), uuid: standardUuid('2a00') };
const BATTERY_LEVEL = { serviceUUID: standardUuid('180f'), uuid: standardUuid('2a19') };
const LAPTOP_ECHO = {
  serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  uuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
};

const readOnly = { canRead: true, canWrite: false, writeWithResponse: false, canNotify: false };
const readWrite = { canRead: true, canWrite: true, writeWithResponse: true, canNotify: false };

const DEVICES: SimulatedDevice[] = [
  {
    advertisement: { id: 'SIMULATED-02', name: 'Headphones (simulated)', rssi: -81, serviceUUIDs: [], isConnectable: true },
    characteristics: [
      { ...DEVICE_NAME, ...readOnly },
      { ...BATTERY_LEVEL, ...readOnly, canNotify: true },
    ],
  },
  {
    advertisement: {
      id: 'SIMULATED-01',
      name: 'Instructor device (simulated)',
      rssi: -52,
      serviceUUIDs: [SERVICE_UUID],
      isConnectable: true,
    },
    characteristics: [{ serviceUUID: SERVICE_UUID, uuid: CHAR_UUID, ...readWrite }],
  },
  {
    advertisement: { id: 'SIMULATED-03', name: 'Laptop (simulated)', rssi: -67, serviceUUIDs: [], isConnectable: true },
    characteristics: [
      { ...DEVICE_NAME, ...readOnly },
      { ...LAPTOP_ECHO, ...readWrite },
    ],
  },
];

const valueKey = (deviceId: string, characteristic: { uuid: string }) => `${deviceId}/${characteristic.uuid}`;

// Current value of every simulated characteristic, as Base64 like real BLE
const values = new Map<string, string>([
  [valueKey('SIMULATED-02', DEVICE_NAME), encodeText('Headphones')],
  [valueKey('SIMULATED-02', BATTERY_LEVEL), Buffer.from([80]).toString('base64')],
  [valueKey('SIMULATED-01', { uuid: CHAR_UUID }), encodeText('Enter your name')],
  [valueKey('SIMULATED-03', DEVICE_NAME), encodeText('Laptop')],
  [valueKey('SIMULATED-03', LAPTOP_ECHO), encodeText('Hello from the laptop')],
]);

const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

let scanTimers: ReturnType<typeof setTimeout>[] = [];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Same name -> same "prediction"
function predictGrade(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return GRADES[hash % GRADES.length];
}

export const transport: BleTransport = {
  simulated: true,

  watchState(listener) {
    listener('PoweredOn');
    return () => {};
  },

  async getState() {
    return 'PoweredOn';
  },

  startScan(onDevice) {
    scanTimers = DEVICES.map((device, i) => setTimeout(() => onDevice(device.advertisement), 700 * (i + 1)));
  },

  async stopScan() {
    scanTimers.forEach((timer) => clearTimeout(timer));
    scanTimers = [];
  },

  async connect(device) {
    await delay(800);
    const simulated = DEVICES.find((d) => d.advertisement.id === device.id);
    if (!simulated) throw bleFailure(`"${device.name ?? device.id}" is out of range.`);
    return {
      id: device.id,
      name: device.name ?? 'Simulated device',
      mtu: 185,
      characteristics: simulated.characteristics,
    };
  },

  onDisconnected() {
    // Simulated devices never drop the connection
    return () => {};
  },

  async disconnect() {
    // Nothing to close
  },

  async read(deviceId, characteristic) {
    await delay(300);
    return values.get(valueKey(deviceId, characteristic)) ?? '';
  },

  async write(deviceId, characteristic, base64) {
    await delay(300);
    // The instructor device answers with a grade; other characteristics keep what was written
    const reply = isAssignmentCharacteristic(characteristic)
      ? encodeText(`${decodeText(base64)} - Your grade is ${predictGrade(decodeText(base64))}.`)
      : base64;
    values.set(valueKey(deviceId, characteristic), reply);
  },
};
