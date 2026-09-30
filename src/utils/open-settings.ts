import { Linking, Platform } from 'react-native';

import type { SettingsFix } from '@/ble/errors';

export const SETTINGS_LABELS: Record<SettingsFix, string> = {
  bluetooth: 'Open Bluetooth settings',
  location: 'Open Location settings',
  app: 'Open app settings',
};

const ANDROID_ACTIONS: Record<Exclude<SettingsFix, 'app'>, string> = {
  bluetooth: 'android.settings.BLUETOOTH_SETTINGS',
  location: 'android.settings.LOCATION_SOURCE_SETTINGS',
};

export async function openSettings(fix: SettingsFix) {
  // Browsers have no settings screen to open
  if (Platform.OS === 'web') return;
  if (Platform.OS === 'android' && fix !== 'app') {
    try {
      await Linking.sendIntent(ANDROID_ACTIONS[fix]);
      return;
    } catch {
      // Fall back to the app's own settings page
    }
  }
  await Linking.openSettings().catch(() => {});
}
