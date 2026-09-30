import { SERVICE_UUID } from './constants';
import { bleFailure } from './errors';
import type { Advertisement, BleTransport } from './model';

// Browsers can't use react-native-ble-plx, so the web preview talks to a simulated device that
// behaves like the instructor's one: "Enter your name" -> write a name -> "<name> - Your grade is X."
// Real Bluetooth only works in the Android app.

const TARGET_ID = 'SIMULATED-01';

const NEARBY: Advertisement[] = [
  { id: 'SIMULATED-02', name: 'Headphones (simulated)', rssi: -81, serviceUUIDs: [], isConnectable: true },
  {
    id: TARGET_ID,
    name: 'Instructor device (simulated)',
    rssi: -52,
    serviceUUIDs: [SERVICE_UUID],
    isConnectable: true,
  },
  { id: 'SIMULATED-03', name: 'Laptop (simulated)', rssi: -67, serviceUUIDs: [], isConnectable: true },
];

const GRADES = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

let value = 'Enter your name';
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
    scanTimers = NEARBY.map((advertisement, i) => setTimeout(() => onDevice(advertisement), 700 * (i + 1)));
  },

  async stopScan() {
    scanTimers.forEach((timer) => clearTimeout(timer));
    scanTimers = [];
  },

  async connect(device) {
    await delay(800);
    if (device.id !== TARGET_ID) {
      throw bleFailure(`"${device.name ?? device.id}" does not have the service ${SERVICE_UUID}. Choose another device.`);
    }
    return {
      id: device.id,
      name: device.name ?? 'Simulated device',
      mtu: 185,
      canRead: true,
      canWrite: true,
      writeWithResponse: true,
    };
  },

  onDisconnected() {
    // The simulated device never drops the connection
    return () => {};
  },

  async disconnect() {
    // Nothing to close
  },

  async read() {
    await delay(300);
    return value;
  },

  async write(_device, text) {
    await delay(300);
    value = `${text} - Your grade is ${predictGrade(text)}.`;
  },
};
