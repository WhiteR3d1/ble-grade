import { CHAR_UUID, SERVICE_UUID } from './constants';

// Same values as react-native-ble-plx's `State`
export type AdapterState =
  | 'Unknown'
  | 'Resetting'
  | 'Unsupported'
  | 'Unauthorized'
  | 'PoweredOff'
  | 'PoweredOn';

// 'assignment': only the instructor's service/characteristic. 'any': any device, pick a characteristic.
export type ConnectMode = 'assignment' | 'any';

// One advertisement seen while scanning
export type Advertisement = {
  id: string;
  name: string | null;
  rssi: number | null;
  serviceUUIDs: string[];
  isConnectable: boolean | null;
};

export type ScannedDevice = {
  id: string;
  name: string | null;
  rssi: number | null;
  hasTargetService: boolean;
};

export type GattCharacteristic = {
  serviceUUID: string;
  uuid: string;
  canRead: boolean;
  canWrite: boolean;
  // Write request (device confirms) vs. write command (no confirmation)
  writeWithResponse: boolean;
  canNotify: boolean;
};

export type ConnectedDevice = {
  id: string;
  name: string;
  mtu: number;
  // Every characteristic of every service, in discovery order
  characteristics: GattCharacteristic[];
};

// Everything the app needs from Bluetooth.
// transport.ts talks to real BLE; transport.web.ts simulates devices for the web preview.
// Values travel as Base64, like in react-native-ble-plx.
export type BleTransport = {
  simulated: boolean;
  watchState(listener: (state: AdapterState) => void): () => void;
  getState(): Promise<AdapterState>;
  startScan(onDevice: (advertisement: Advertisement) => void, onError: (error: Error) => void): void;
  stopScan(): Promise<void>;
  // Connects and discovers all services and characteristics
  connect(device: ScannedDevice): Promise<ConnectedDevice>;
  onDisconnected(deviceId: string, listener: () => void): () => void;
  disconnect(deviceId: string): Promise<void>;
  read(deviceId: string, characteristic: GattCharacteristic): Promise<string>;
  write(deviceId: string, characteristic: GattCharacteristic, base64: string): Promise<void>;
};

export const sameUuid = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const isAssignmentCharacteristic = (characteristic: GattCharacteristic) =>
  sameUuid(characteristic.serviceUUID, SERVICE_UUID) && sameUuid(characteristic.uuid, CHAR_UUID);
