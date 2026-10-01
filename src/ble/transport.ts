import { Platform } from 'react-native';
import { BleErrorCode, BleManager, ScanMode, type BleError } from 'react-native-ble-plx';

import { CONNECT_TIMEOUT_MS, PREFERRED_MTU } from './constants';
import { bleFailure, errorMessage, type BleFailure } from './errors';
import type { BleTransport, GattCharacteristic } from './model';

let sharedManager: BleManager | null = null;

// Created on first use so importing this file has no side effects.
// react-native-ble-plx 3.x hands back the same shared instance on every `new BleManager()`.
function manager(): BleManager {
  if (!sharedManager) sharedManager = new BleManager();
  return sharedManager;
}

function isBleError(error: unknown): error is BleError {
  return typeof error === 'object' && error !== null && 'errorCode' in error;
}

function withReason(message: string, error: BleError): string {
  return error.reason ? `${message}\n\nDetails: ${error.reason}` : message;
}

// Turns react-native-ble-plx errors into messages a user can act on
function toFailure(error: unknown): BleFailure {
  if (!isBleError(error)) return bleFailure(errorMessage(error));

  switch (error.errorCode) {
    case BleErrorCode.BluetoothPoweredOff:
      return bleFailure('Bluetooth is off. Turn it on and try again.', 'bluetooth');
    case BleErrorCode.BluetoothUnauthorized:
      return bleFailure(
        'Permission missing. Allow "Nearby devices" and precise "Location" for this app.',
        'app'
      );
    case BleErrorCode.LocationServicesDisabled:
      return bleFailure('Location is off. Android needs Location ON to find BLE devices.', 'location');
    case BleErrorCode.ScanStartFailed:
      return bleFailure(
        withReason('Could not start scanning. If you tapped Scan many times, wait 30 seconds and try again.', error)
      );
    case BleErrorCode.OperationTimedOut:
      return bleFailure('The device did not answer in time. Move closer and try again.');
    case BleErrorCode.DeviceConnectionFailed:
      return bleFailure(
        withReason('Could not connect. The device may be busy with another phone, wait a moment and try again.', error)
      );
    case BleErrorCode.DeviceDisconnected:
    case BleErrorCode.DeviceNotConnected:
      return bleFailure('The device is disconnected. Scan and connect again.');
    case BleErrorCode.ServiceNotFound:
    case BleErrorCode.CharacteristicNotFound:
      return bleFailure('This device does not have the required service. Choose another device.');
    case BleErrorCode.CharacteristicReadFailed:
      return bleFailure(withReason('Reading the value failed.', error));
    case BleErrorCode.CharacteristicWriteFailed:
      return bleFailure(withReason('Writing the value failed.', error));
    default:
      return bleFailure(error.reason ?? error.message);
  }
}

// Real Bluetooth LE through react-native-ble-plx (Android / iOS)
export const transport: BleTransport = {
  simulated: false,

  watchState(listener) {
    const subscription = manager().onStateChange(listener, true);
    return () => subscription.remove();
  },

  getState() {
    return manager().state();
  },

  startScan(onDevice, onError) {
    manager()
      .startDeviceScan(null, { scanMode: ScanMode.LowLatency }, (error, device) => {
        if (error) {
          onError(toFailure(error));
          return;
        }
        if (!device) return;
        onDevice({
          id: device.id,
          name: device.name ?? device.localName,
          rssi: device.rssi,
          serviceUUIDs: device.serviceUUIDs ?? [],
          isConnectable: device.isConnectable,
        });
      })
      .catch((error: unknown) => onError(toFailure(error)));
  },

  async stopScan() {
    await manager()
      .stopDeviceScan()
      .catch(() => {});
  },

  async connect(device) {
    try {
      const connected = await manager().connectToDevice(device.id, { timeout: CONNECT_TIMEOUT_MS });
      // Services and characteristics must be discovered before reading or writing
      await connected.discoverAllServicesAndCharacteristics();

      const characteristics: GattCharacteristic[] = [];
      for (const service of await connected.services()) {
        for (const characteristic of await service.characteristics()) {
          characteristics.push({
            serviceUUID: service.uuid,
            uuid: characteristic.uuid,
            canRead: characteristic.isReadable,
            canWrite: characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse,
            writeWithResponse:
              characteristic.isWritableWithResponse || !characteristic.isWritableWithoutResponse,
            canNotify: characteristic.isNotifiable || characteristic.isIndicatable,
          });
        }
      }

      let mtu = connected.mtu;
      if (Platform.OS === 'android') {
        try {
          mtu = (await connected.requestMTU(PREFERRED_MTU)).mtu;
        } catch {
          // Optional: keep the default MTU if the device refuses a bigger one
        }
      }

      return { id: device.id, name: connected.name ?? device.name ?? 'Unnamed device', mtu, characteristics };
    } catch (error) {
      await manager()
        .cancelDeviceConnection(device.id)
        .catch(() => {});
      throw toFailure(error);
    }
  },

  onDisconnected(deviceId, listener) {
    const subscription = manager().onDeviceDisconnected(deviceId, () => listener());
    return () => subscription.remove();
  },

  async disconnect(deviceId) {
    await manager()
      .cancelDeviceConnection(deviceId)
      .catch(() => {});
  },

  async read(deviceId, { serviceUUID, uuid }) {
    try {
      const characteristic = await manager().readCharacteristicForDevice(deviceId, serviceUUID, uuid);
      return characteristic.value ?? '';
    } catch (error) {
      throw toFailure(error);
    }
  },

  async write(deviceId, { serviceUUID, uuid, writeWithResponse }, base64) {
    try {
      if (writeWithResponse) {
        await manager().writeCharacteristicWithResponseForDevice(deviceId, serviceUUID, uuid, base64);
      } else {
        await manager().writeCharacteristicWithoutResponseForDevice(deviceId, serviceUUID, uuid, base64);
      }
    } catch (error) {
      throw toFailure(error);
    }
  },
};
