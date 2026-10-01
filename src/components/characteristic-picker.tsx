import { useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { describeProperties, gattName } from '@/ble/gatt';
import { isAssignmentCharacteristic, type ConnectedDevice, type GattCharacteristic } from '@/ble/model';
import type { Ble } from '@/ble/use-ble';
import { AppButton } from '@/components/app-button';
import { DeviceCard } from '@/components/device-card';
import { SimulatedNotice } from '@/components/simulated-notice';
import { Colors, MonoFont, Radius, Spacing } from '@/constants/theme';

// "Any device" mode: list every service and characteristic of the connected device
export function CharacteristicPicker({ ble, device }: { ble: Ble; device: ConnectedDevice }) {
  const insets = useSafeAreaInsets();
  const { disconnect } = ble;
  const services = groupByService(device.characteristics);

  // Android back button disconnects instead of closing the app
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      disconnect();
      return true;
    });
    return () => subscription.remove();
  }, [disconnect]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
      {ble.simulated && <SimulatedNotice />}
      <DeviceCard device={device} />

      <Text style={styles.sectionTitle}>Pick a characteristic to read and write</Text>
      {services.length === 0 && <Text style={styles.empty}>This device has no characteristics.</Text>}

      {services.map(([serviceUUID, characteristics]) => (
        <View key={serviceUUID} style={styles.service}>
          <Text style={styles.serviceName}>{gattName(serviceUUID) ?? 'Custom service'}</Text>
          <Text style={styles.uuid}>{serviceUUID}</Text>
          {characteristics.map((characteristic) => (
            <Pressable
              key={characteristic.uuid}
              onPress={() => ble.select(characteristic)}
              style={({ pressed }) => [
                styles.row,
                isAssignmentCharacteristic(characteristic) && styles.rowTarget,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.rowText}>
                <Text style={styles.characteristicName}>{gattName(characteristic.uuid) ?? 'Characteristic'}</Text>
                <Text style={styles.uuid}>{characteristic.uuid}</Text>
                <Text style={styles.properties}>{describeProperties(characteristic)}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <AppButton title="Disconnect" variant="quiet" onPress={disconnect} />
    </ScrollView>
  );
}

function groupByService(characteristics: GattCharacteristic[]): [string, GattCharacteristic[]][] {
  const groups = new Map<string, GattCharacteristic[]>();
  for (const characteristic of characteristics) {
    const group = groups.get(characteristic.serviceUUID) ?? [];
    group.push(characteristic);
    groups.set(characteristic.serviceUUID, group);
  }
  return [...groups.entries()];
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.muted },
  empty: { color: Colors.muted, textAlign: 'center', paddingVertical: Spacing.lg },
  service: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  serviceName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  uuid: { fontFamily: MonoFont, fontSize: 12, color: Colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  rowTarget: { borderColor: Colors.borderStrong, borderWidth: 1.5 },
  rowPressed: { backgroundColor: Colors.border },
  rowText: { flex: 1, gap: 2 },
  characteristicName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  properties: { fontSize: 12, fontWeight: '600', color: Colors.text },
  chevron: { fontSize: 24, color: Colors.muted },
});
