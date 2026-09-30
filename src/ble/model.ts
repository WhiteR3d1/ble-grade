// Same values as react-native-ble-plx's `State`
export type AdapterState =
  | 'Unknown'
  | 'Resetting'
  | 'Unsupported'
  | 'Unauthorized'
  | 'PoweredOff'
  | 'PoweredOn';

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

export type ConnectedDevice = {
  id: string;
  name: string;
  mtu: number;
  canRead: boolean;
  canWrite: boolean;
  // Write request (device confirms) vs. write command (no confirmation)
  writeWithResponse: boolean;
};

// Everything the app needs from Bluetooth.
// transport.ts talks to real BLE; transport.web.ts simulates the device for the web preview.
export type BleTransport = {
  simulated: boolean;
  watchState(listener: (state: AdapterState) => void): () => void;
  getState(): Promise<AdapterState>;
  startScan(onDevice: (advertisement: Advertisement) => void, onError: (error: Error) => void): void;
  stopScan(): Promise<void>;
  // Connects and checks that the device really has SERVICE_UUID and CHAR_UUID
  connect(device: ScannedDevice): Promise<ConnectedDevice>;
  onDisconnected(deviceId: string, listener: () => void): () => void;
  disconnect(deviceId: string): Promise<void>;
  read(device: ConnectedDevice): Promise<string>;
  write(device: ConnectedDevice, text: string): Promise<void>;
};

export const sameUuid = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
