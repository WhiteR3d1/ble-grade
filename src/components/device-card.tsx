import { StyleSheet, Text, View } from 'react-native';

import { describeProperties, gattName } from '@/ble/gatt';
import type { ConnectedDevice, GattCharacteristic } from '@/ble/model';
import { Colors, MonoFont, Radius, Spacing } from '@/constants/theme';

type Props = {
  device: ConnectedDevice;
  // Shown when a characteristic has been chosen
  characteristic?: GattCharacteristic;
};

export function DeviceCard({ device, characteristic }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.caption}>Connected to</Text>
          <Text style={styles.name} numberOfLines={2}>
            {device.name}
          </Text>
        </View>
        <View style={styles.connectedPill}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      </View>
      <Text style={styles.meta}>{`${device.id}  ·  MTU ${device.mtu}`}</Text>
      {characteristic && (
        <>
          <View style={styles.divider} />
          <InfoRow label={withName('Service', characteristic.serviceUUID)} value={characteristic.serviceUUID} />
          <InfoRow
            label={`${withName('Characteristic', characteristic.uuid)} (${describeProperties(characteristic)})`}
            value={characteristic.uuid}
          />
        </>
      )}
    </View>
  );
}

function withName(label: string, uuid: string): string {
  const name = gattName(uuid);
  return name ? `${label} · ${name}` : label;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  flex: { flex: 1 },
  caption: { fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 20, fontWeight: '700', color: Colors.text },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.onAccent },
  connectedText: { fontSize: 12, fontWeight: '700', color: Colors.onAccent },
  meta: { fontFamily: MonoFont, fontSize: 12, color: Colors.muted },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  infoRow: { gap: 2 },
  infoLabel: { fontSize: 12, color: Colors.muted },
  infoValue: { fontFamily: MonoFont, fontSize: 12, color: Colors.text },
});
