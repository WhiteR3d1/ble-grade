import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'blocked';

// Android 12+ (API 31): "Nearby devices" (scan + connect) and precise Location.
// Android 11 and lower: Location only. iOS asks by itself the first time Bluetooth is used.
function requiredPermissions(): Permission[] {
  if (Platform.OS !== 'android') return [];
  if (Platform.Version >= 31) {
    return [
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ];
  }
  return [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
}

export async function requestBlePermissions(): Promise<PermissionStatus> {
  const permissions = requiredPermissions();
  if (permissions.length === 0) return 'granted';

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const statuses = permissions.map((permission) => results[permission]);

  if (statuses.every((status) => status === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (statuses.some((status) => status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}

// Checks without showing a dialog, e.g. after the user comes back from the Settings app
export async function hasBlePermissions(): Promise<boolean> {
  const checks = await Promise.all(requiredPermissions().map((p) => PermissionsAndroid.check(p)));
  return checks.every(Boolean);
}
