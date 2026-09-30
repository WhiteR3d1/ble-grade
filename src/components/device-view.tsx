import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { byteLength } from '@/ble/codec';
import { CHAR_UUID, SERVICE_UUID } from '@/ble/constants';
import { errorMessage } from '@/ble/errors';
import type { ConnectedDevice } from '@/ble/model';
import type { Ble } from '@/ble/use-ble';
import { AppButton } from '@/components/app-button';
import { SimulatedNotice } from '@/components/simulated-notice';
import { StepCard } from '@/components/step-card';
import { Colors, MonoFont, Radius, Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { showAlert } from '@/utils/alert';
import { composeMessage, formatTime, parseGrade } from '@/utils/format';

type Reading = { value: string; at: Date };
type Busy = 'first-read' | 'write' | 'second-read' | null;

// Assignment flow: 1. read -> 2. write "name & buddy" -> 3. read again (predicted grade).
// Each result stays on screen so one screenshot shows the whole flow.
export function DeviceView({ ble, device }: { ble: Ble; device: ConnectedDevice }) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);
  const buddyInputRef = useRef<TextInput>(null);
  const writeStepY = useRef(0);

  const [busy, setBusy] = useState<Busy>(null);
  const [firstRead, setFirstRead] = useState<Reading | null>(null);
  const [written, setWritten] = useState<Reading | null>(null);
  const [secondRead, setSecondRead] = useState<Reading | null>(null);
  const [name, setName] = useState('');
  const [buddy, setBuddy] = useState('');

  const message = composeMessage(name, buddy);
  const grade = secondRead ? parseGrade(secondRead.value) : null;
  const { disconnect } = ble;

  // Android back button disconnects instead of closing the app, so the device is freed for the next phone
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      disconnect();
      return true;
    });
    return () => subscription.remove();
  }, [disconnect]);

  // Keep the write step (inputs + button) visible above the keyboard
  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollRef.current?.scrollTo({ y: Math.max(0, writeStepY.current - Spacing.md), animated: true });
    }
  }, [keyboardHeight]);

  async function readValue(step: 'first-read' | 'second-read') {
    setBusy(step);
    try {
      const reading = { value: await ble.read(), at: new Date() };
      if (step === 'first-read') setFirstRead(reading);
      else setSecondRead(reading);
    } catch (error) {
      showAlert('Read failed', errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function writeValue() {
    if (!message) {
      showAlert('Input Error', 'Please enter your name.');
      return;
    }
    Keyboard.dismiss();
    setBusy('write');
    try {
      await ble.write(message);
      setWritten({ value: message, at: new Date() });
      showAlert('Write Success', `Value "${message}" written successfully.`);
    } catch (error) {
      showAlert('Write failed', errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing.xl + keyboardHeight },
      ]}
      keyboardShouldPersistTaps="handled">
      {ble.simulated && <SimulatedNotice />}
      <DeviceCard device={device} />

      <StepCard step={1} title="Read the characteristic" done={firstRead !== null}>
        <AppButton
          title="Read value"
          onPress={() => readValue('first-read')}
          loading={busy === 'first-read'}
          disabled={busy !== null}
        />
        <ResultBox reading={firstRead} placeholder="No value read yet" />
      </StepCard>

      <View
        onLayout={(event) => {
          writeStepY.current = event.nativeEvent.layout.y;
        }}>
        <StepCard step={2} title="Write your name and your buddy" done={written !== null}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={Colors.muted}
            selectionColor={Colors.text}
            cursorColor={Colors.text}
            keyboardAppearance="dark"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => buddyInputRef.current?.focus()}
          />
          <TextInput
            ref={buddyInputRef}
            style={styles.input}
            value={buddy}
            onChangeText={setBuddy}
            placeholder="Your buddy's name (optional)"
            placeholderTextColor={Colors.muted}
            selectionColor={Colors.text}
            cursorColor={Colors.text}
            keyboardAppearance="dark"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
          />
          <Text style={styles.preview}>
            {message
              ? `Will write: "${message}" (${byteLength(message)} bytes)`
              : 'Type your name to see what will be written.'}
          </Text>
          <AppButton
            title="Write value"
            onPress={writeValue}
            loading={busy === 'write'}
            disabled={busy !== null}
          />
          {written && (
            <Text style={styles.written}>{`✓ Wrote "${written.value}" at ${formatTime(written.at)}`}</Text>
          )}
        </StepCard>
      </View>

      <StepCard step={3} title="Read again: your predicted grade" done={secondRead !== null}>
        <AppButton
          title="Read value again"
          onPress={() => readValue('second-read')}
          loading={busy === 'second-read'}
          disabled={busy !== null}
        />
        {grade && <GradeBadge grade={grade} />}
        <ResultBox reading={secondRead} placeholder="Write in step 2, then read again to see your grade" />
      </StepCard>

      <AppButton title="Disconnect" variant="quiet" onPress={disconnect} disabled={busy !== null} />
    </ScrollView>
  );
}

function DeviceCard({ device }: { device: ConnectedDevice }) {
  const properties =
    [
      device.canRead ? 'Read' : null,
      device.canWrite ? (device.writeWithResponse ? 'Write' : 'Write without response') : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'none';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.caption}>Connected to</Text>
          <Text style={styles.deviceName} numberOfLines={1}>
            {device.name}
          </Text>
        </View>
        <View style={styles.connectedPill}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedText}>Connected</Text>
        </View>
      </View>
      <Text style={styles.meta}>{`${device.id}  ·  MTU ${device.mtu}`}</Text>
      <View style={styles.divider} />
      <InfoRow label="Service" value={SERVICE_UUID} />
      <InfoRow label={`Characteristic (${properties})`} value={CHAR_UUID} />
    </View>
  );
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

function ResultBox({ reading, placeholder }: { reading: Reading | null; placeholder: string }) {
  return (
    <View style={styles.result}>
      {reading ? (
        <>
          <Text style={styles.resultValue} selectable>
            {reading.value === '' ? '(empty value)' : reading.value}
          </Text>
          <Text style={styles.resultTime}>Read at {formatTime(reading.at)}</Text>
        </>
      ) : (
        <Text style={styles.resultPlaceholder}>{placeholder}</Text>
      )}
    </View>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  return (
    <View style={styles.grade}>
      <Text style={styles.gradeLabel}>Predicted grade</Text>
      <Text style={styles.gradeValue}>{grade}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  flex: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  caption: { fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  deviceName: { fontSize: 20, fontWeight: '700', color: Colors.text },
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  preview: { fontSize: 13, color: Colors.muted },
  written: { fontSize: 13, fontWeight: '700', color: Colors.text },
  result: { backgroundColor: Colors.surfaceRaised, borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.xs },
  resultValue: { fontSize: 16, color: Colors.text, textAlign: 'center' },
  resultTime: { fontSize: 12, color: Colors.muted, textAlign: 'center' },
  resultPlaceholder: { fontSize: 14, color: Colors.muted, textAlign: 'center' },
  grade: {
    alignItems: 'center',
    backgroundColor: Colors.accent,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradeValue: { fontSize: 48, lineHeight: 56, fontWeight: '800', color: Colors.onAccent },
});
