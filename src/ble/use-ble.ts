import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { SCAN_DURATION_MS, SERVICE_UUID } from './constants';
import { describeError, type SettingsFix } from './errors';
import {
  sameUuid,
  type AdapterState,
  type ConnectedDevice,
  type ScannedDevice,
} from './model';
import { hasBlePermissions, requestBlePermissions, type PermissionStatus } from './permissions';
// Metro picks transport.web.ts (simulated device) for the web build
import { transport } from './transport';

export type Banner = {
  tone: 'info' | 'error';
  message: string;
  fix?: SettingsFix;
};

export type Ble = ReturnType<typeof useBle>;

export function useBle() {
  const [bluetoothState, setBluetoothState] = useState<AdapterState>('Unknown');
  const [permission, setPermission] = useState<PermissionStatus | 'checking'>('checking');
  const [scanning, setScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connected, setConnected] = useState<ConnectedDevice | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const stopWatchingDisconnect = useRef<(() => void) | null>(null);

  // Bluetooth adapter on/off
  useEffect(() => transport.watchState(setBluetoothState), []);

  // Ask for permissions when the app opens, and re-check after coming back from the Settings app
  useEffect(() => {
    requestBlePermissions().then(setPermission, () => setPermission('denied'));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      hasBlePermissions().then(
        (granted) => {
          if (granted) setPermission('granted');
        },
        () => {}
      );
    });
    return () => subscription.remove();
  }, []);

  // While `scanning` is true: scan, refresh the list twice a second, stop after SCAN_DURATION_MS
  useEffect(() => {
    if (!scanning) return;

    const found = new Map<string, ScannedDevice>();
    const publish = () => {
      const all = [...found.values()];
      // Devices advertising our service go first; the rest keep discovery order so rows don't jump
      setDevices([...all.filter((d) => d.hasTargetService), ...all.filter((d) => !d.hasTargetService)]);
    };

    transport.startScan(
      (advertisement) => {
        const previous = found.get(advertisement.id);
        const hasTargetService =
          (previous?.hasTargetService ?? false) ||
          advertisement.serviceUUIDs.some((uuid) => sameUuid(uuid, SERVICE_UUID));
        const name = advertisement.name ?? previous?.name ?? null;
        // Skip nameless devices and ones that refuse connections, unless they advertise our service
        if (!hasTargetService && (!name || advertisement.isConnectable === false)) return;

        found.set(advertisement.id, { id: advertisement.id, name, rssi: advertisement.rssi, hasTargetService });
      },
      (error) => {
        setBanner({ tone: 'error', ...describeError(error) });
        setScanning(false);
      }
    );

    const publishTimer = setInterval(publish, 500);
    const stopTimer = setTimeout(() => setScanning(false), SCAN_DURATION_MS);
    return () => {
      clearInterval(publishTimer);
      clearTimeout(stopTimer);
      transport.stopScan();
      publish();
    };
  }, [scanning]);

  async function requestPermissions() {
    setPermission(await requestBlePermissions().catch((): PermissionStatus => 'denied'));
  }

  async function startScan() {
    if (scanning || connectingId) return;
    setBanner(null);
    try {
      const status = await requestBlePermissions();
      setPermission(status);
      if (status !== 'granted') {
        setBanner({
          tone: 'error',
          message: 'Allow "Nearby devices" and precise "Location" so the app can find BLE devices.',
          fix: status === 'blocked' ? 'app' : undefined,
        });
        return;
      }
      if ((await transport.getState()) === 'PoweredOff') {
        setBanner({ tone: 'error', message: 'Bluetooth is off. Turn it on and scan again.', fix: 'bluetooth' });
        return;
      }
      setDevices([]);
      setHasScanned(true);
      setScanning(true);
    } catch (error) {
      setBanner({ tone: 'error', ...describeError(error) });
    }
  }

  function stopScan() {
    setScanning(false);
  }

  async function connect(device: ScannedDevice) {
    if (connectingId) return;
    setBanner(null);
    setScanning(false);
    // Stop right away: connecting while still scanning is unreliable on some phones
    await transport.stopScan();
    setConnectingId(device.id);
    try {
      const info = await transport.connect(device);
      stopWatchingDisconnect.current = transport.onDisconnected(info.id, () => {
        stopWatchingDisconnect.current?.();
        stopWatchingDisconnect.current = null;
        setConnected(null);
        setBanner({ tone: 'info', message: `Connection to "${info.name}" was lost. Scan and connect again.` });
      });
      setConnected(info);
    } finally {
      setConnectingId(null);
    }
  }

  async function read(): Promise<string> {
    if (!connected) throw new Error('Not connected.');
    return transport.read(connected);
  }

  async function write(text: string): Promise<void> {
    if (!connected) throw new Error('Not connected.');
    await transport.write(connected, text);
  }

  async function disconnect() {
    if (!connected) return;
    // Stop listening first so a normal disconnect isn't reported as "connection lost"
    stopWatchingDisconnect.current?.();
    stopWatchingDisconnect.current = null;
    setConnected(null);
    setBanner({ tone: 'info', message: `Disconnected from "${connected.name}".` });
    await transport.disconnect(connected.id);
  }

  return {
    simulated: transport.simulated,
    bluetoothState,
    permission,
    scanning,
    hasScanned,
    devices,
    connectingId,
    connected,
    banner,
    requestPermissions,
    startScan,
    stopScan,
    connect,
    read,
    write,
    disconnect,
  };
}
