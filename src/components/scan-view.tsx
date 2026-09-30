import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVICE_UUID } from '@/ble/constants';
import { errorMessage, type SettingsFix } from '@/ble/errors';
import type { AdapterState, ScannedDevice } from '@/ble/model';
import type { Banner, Ble } from '@/ble/use-ble';
import { AppButton } from '@/components/app-button';
import { SimulatedNotice } from '@/components/simulated-notice';
import { Colors, MonoFont, Radius, Spacing } from '@/constants/theme';
import { showAlert } from '@/utils/alert';
import { openSettings, SETTINGS_LABELS } from '@/utils/open-settings';

type Tone = 'good' | 'bad' | 'neutral';

type Status = {
  text: string;
  tone: Tone;
  onPress?: () => void;
};

export function ScanView({ ble }: { ble: Ble }) {
  const insets = useSafeAreaInsets();
  const busy = ble.connectingId !== null;

  function connect(device: ScannedDevice) {
    ble.connect(device).catch((error: unknown) => showAlert('Connection failed', errorMessage(error)));
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      data={ble.devices}
      keyExtractor={(device) => device.id}
      ListHeaderComponent={<Header ble={ble} busy={busy} />}
      ListEmptyComponent={ble.scanning ? null : <EmptyState hasScanned={ble.hasScanned} />}
      renderItem={({ item }) => (
        <DeviceRow
          device={item}
          connecting={ble.connectingId === item.id}
          disabled={busy}
          onPress={() => connect(item)}
        />
      )}
    />
  );
}

function Header({ ble, busy }: { ble: Ble; busy: boolean }) {
  return (
    <View style={styles.header}>
      {ble.simulated && <SimulatedNotice />}

      <View style={styles.statusRow}>
        <StatusPill status={bluetoothStatus(ble.bluetoothState)} />
        <StatusPill status={permissionStatus(ble)} />
      </View>

      <View style={styles.targetCard}>
        <Text style={styles.caption}>Looking for service</Text>
        <Text style={styles.uuid}>{SERVICE_UUID}</Text>
      </View>

      <AppButton
        title={ble.scanning ? 'Stop scanning' : 'Scan devices'}
        variant={ble.scanning ? 'secondary' : 'primary'}
        onPress={ble.scanning ? ble.stopScan : ble.startScan}
        disabled={busy}
      />

      {ble.scanning && (
        <View style={styles.scanningRow}>
          <ActivityIndicator color={Colors.text} />
          <Text style={styles.muted}>Scanning... {ble.devices.length} found</Text>
        </View>
      )}

      {ble.banner && <BannerView banner={ble.banner} />}

      {ble.devices.length > 0 && <Text style={styles.sectionTitle}>Tap a device to connect</Text>}
    </View>
  );
}

function bluetoothStatus(state: AdapterState): Status {
  switch (state) {
    case 'PoweredOn':
      return { text: 'Bluetooth on', tone: 'good' };
    case 'PoweredOff':
      return { text: 'Bluetooth off', tone: 'bad', onPress: () => openSettings('bluetooth') };
    case 'Unauthorized':
      return { text: 'Bluetooth not allowed', tone: 'bad', onPress: () => openSettings('app') };
    case 'Unsupported':
      return { text: 'No Bluetooth LE', tone: 'bad' };
    default:
      return { text: 'Checking Bluetooth', tone: 'neutral' };
  }
}

function permissionStatus(ble: Ble): Status {
  switch (ble.permission) {
    case 'granted':
      return { text: 'Permissions OK', tone: 'good' };
    case 'denied':
      return { text: 'Permissions needed', tone: 'bad', onPress: ble.requestPermissions };
    case 'blocked':
      return { text: 'Permissions blocked', tone: 'bad', onPress: () => openSettings('app') };
    default:
      return { text: 'Checking permissions', tone: 'neutral' };
  }
}

function StatusPill({ status }: { status: Status }) {
  const colors = toneColors[status.tone];
  return (
    <Pressable
      onPress={status.onPress}
      disabled={!status.onPress}
      style={[styles.pill, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: colors.foreground }]} />
      <View style={styles.pillText}>
        <Text style={[styles.pillLabel, { color: colors.foreground }]} numberOfLines={1}>
          {status.text}
        </Text>
        {status.onPress && <Text style={[styles.pillAction, { color: colors.foreground }]}>Tap to fix</Text>}
      </View>
    </Pressable>
  );
}

function BannerView({ banner }: { banner: Banner }) {
  const isError = banner.tone === 'error';
  const textColor = isError ? Colors.onAccent : Colors.text;
  return (
    <View style={[styles.banner, isError ? styles.bannerError : styles.bannerInfo]}>
      <Text style={[styles.bannerText, { color: textColor }]}>{banner.message}</Text>
      {banner.fix && <SettingsLink fix={banner.fix} color={textColor} />}
    </View>
  );
}

function SettingsLink({ fix, color }: { fix: SettingsFix; color: string }) {
  return (
    <Pressable onPress={() => openSettings(fix)} hitSlop={8}>
      <Text style={[styles.link, { color }]}>{SETTINGS_LABELS[fix]} ›</Text>
    </Pressable>
  );
}

type DeviceRowProps = {
  device: ScannedDevice;
  connecting: boolean;
  disabled: boolean;
  onPress: () => void;
};

function DeviceRow({ device, connecting, disabled, onPress }: DeviceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        device.hasTargetService && styles.rowTarget,
        pressed && styles.rowPressed,
        disabled && !connecting && styles.rowDisabled,
      ]}>
      <View style={styles.rowText}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name ?? 'Unnamed device'}
        </Text>
        <Text style={styles.deviceMeta} numberOfLines={1}>
          {device.rssi === null ? device.id : `${device.id}  ·  ${device.rssi} dBm`}
        </Text>
        {device.hasTargetService && <Text style={styles.targetBadge}>✓ Has the target service</Text>}
      </View>
      {connecting ? (
        <ActivityIndicator color={Colors.text} />
      ) : (
        <Text style={styles.connectLabel}>Connect</Text>
      )}
    </Pressable>
  );
}

function EmptyState({ hasScanned }: { hasScanned: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{hasScanned ? 'No devices found' : 'Ready to scan'}</Text>
      <Text style={styles.emptyText}>
        {hasScanned
          ? 'Check that Bluetooth and Location are on and you are close to the device, then scan again. If another phone is connected to it, wait until they disconnect.'
          : 'Tap "Scan devices" and pick the instructor\'s device. Devices that advertise the target service are marked with ✓.'}
      </Text>
    </View>
  );
}

// OK = dark, needs attention = inverted (black on white), unknown = dimmed
const toneColors: Record<Tone, { background: string; foreground: string; border: string }> = {
  good: { background: Colors.surface, foreground: Colors.text, border: Colors.border },
  bad: { background: Colors.accent, foreground: Colors.onAccent, border: Colors.accent },
  neutral: { background: Colors.surface, foreground: Colors.muted, border: Colors.border },
};

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  header: { gap: Spacing.md, marginBottom: Spacing.xs },
  statusRow: { flexDirection: 'row', gap: Spacing.sm },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { flex: 1 },
  pillLabel: { fontSize: 13, fontWeight: '600' },
  pillAction: { fontSize: 12, textDecorationLine: 'underline' },
  targetCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 2,
  },
  caption: { fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  uuid: { fontFamily: MonoFont, fontSize: 13, color: Colors.text },
  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  muted: { color: Colors.muted },
  banner: { borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.sm },
  bannerInfo: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  bannerError: { backgroundColor: Colors.accent },
  bannerText: { lineHeight: 20 },
  link: { fontWeight: '700', textDecorationLine: 'underline' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.muted, marginTop: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  rowTarget: { borderColor: Colors.borderStrong, borderWidth: 1.5 },
  rowPressed: { backgroundColor: Colors.surfaceRaised },
  rowDisabled: { opacity: 0.5 },
  rowText: { flex: 1, gap: 2 },
  deviceName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  deviceMeta: { fontFamily: MonoFont, fontSize: 12, color: Colors.muted },
  targetBadge: { fontSize: 12, fontWeight: '700', color: Colors.text, marginTop: 2 },
  connectLabel: { color: Colors.text, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  emptyText: { textAlign: 'center', color: Colors.muted, lineHeight: 20 },
});
