import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { byteLength, decodeText, isReadableText, toHex } from '@/ble/codec';
import { errorMessage } from '@/ble/errors';
import type { ConnectedDevice, GattCharacteristic } from '@/ble/model';
import type { Ble } from '@/ble/use-ble';
import { AppButton } from '@/components/app-button';
import { DeviceCard } from '@/components/device-card';
import { SimulatedNotice } from '@/components/simulated-notice';
import { StepCard } from '@/components/step-card';
import { Colors, MonoFont, Radius, Spacing } from '@/constants/theme';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { showAlert } from '@/utils/alert';
import { composeMessage, formatTime, parseGrade } from '@/utils/format';

type Reading = { base64: string; at: Date };
type Written = { text: string; at: Date };
type Busy = 'first-read' | 'write' | 'second-read' | null;

type Props = {
  ble: Ble;
  device: ConnectedDevice;
  characteristic: GattCharacteristic;
};

// Read -> write -> read again on one characteristic.
// Assignment mode writes "name & buddy" and shows the predicted grade; "Any device" mode writes any text.
// Each result stays on screen so one screenshot shows the whole flow.
export function DeviceView({ ble, device, characteristic }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);
  const buddyInputRef = useRef<TextInput>(null);
  const writeStepY = useRef(0);

  const [busy, setBusy] = useState<Busy>(null);
  const [firstRead, setFirstRead] = useState<Reading | null>(null);
  const [written, setWritten] = useState<Written | null>(null);
  const [secondRead, setSecondRead] = useState<Reading | null>(null);
  const [name, setName] = useState('');
  const [buddy, setBuddy] = useState('');
  const [text, setText] = useState('');

  const assignment = ble.mode === 'assignment';
  const message = assignment ? composeMessage(name, buddy) : text;
  const grade = secondRead ? parseGrade(decodeText(secondRead.base64)) : null;
  const { disconnect, select } = ble;

  // Android back button: "Any device" goes back to the characteristic list, assignment mode disconnects
  // so the device is freed for the next phone
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (assignment) disconnect();
      else select(null);
      return true;
    });
    return () => subscription.remove();
  }, [assignment, disconnect, select]);

  // Keep the write step (inputs + button) visible above the keyboard
  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollRef.current?.scrollTo({ y: Math.max(0, writeStepY.current - Spacing.md), animated: true });
    }
  }, [keyboardHeight]);

  async function readValue(step: 'first-read' | 'second-read') {
    setBusy(step);
    try {
      const reading = { base64: await ble.read(), at: new Date() };
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
      showAlert('Input Error', assignment ? 'Please enter your name.' : 'Please enter a value to write.');
      return;
    }
    Keyboard.dismiss();
    setBusy('write');
    try {
      await ble.write(message);
      setWritten({ text: message, at: new Date() });
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
      <DeviceCard device={device} characteristic={characteristic} />

      <StepCard step={1} title="Read the characteristic" done={firstRead !== null}>
        <AppButton
          title="Read value"
          onPress={() => readValue('first-read')}
          loading={busy === 'first-read'}
          disabled={busy !== null || !characteristic.canRead}
        />
        {!characteristic.canRead && <Text style={styles.note}>This characteristic cannot be read.</Text>}
        <ResultBox reading={firstRead} placeholder="No value read yet" />
      </StepCard>

      <View
        onLayout={(event) => {
          writeStepY.current = event.nativeEvent.layout.y;
        }}>
        <StepCard
          step={2}
          title={assignment ? 'Write your name and your buddy' : 'Write a value'}
          done={written !== null}>
          {assignment ? (
            <>
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
            </>
          ) : (
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Text to write"
              placeholderTextColor={Colors.muted}
              selectionColor={Colors.text}
              cursorColor={Colors.text}
              keyboardAppearance="dark"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={180}
              returnKeyType="done"
            />
          )}
          <Text style={styles.preview}>
            {message
              ? `Will write: "${message}" (${byteLength(message)} bytes)`
              : assignment
                ? 'Type your name to see what will be written.'
                : 'Type the text to write (sent as UTF-8).'}
          </Text>
          <AppButton
            title="Write value"
            onPress={writeValue}
            loading={busy === 'write'}
            disabled={busy !== null || !characteristic.canWrite}
          />
          {!characteristic.canWrite && <Text style={styles.note}>This characteristic cannot be written.</Text>}
          {written && (
            <Text style={styles.written}>{`✓ Wrote "${written.text}" at ${formatTime(written.at)}`}</Text>
          )}
        </StepCard>
      </View>

      <StepCard
        step={3}
        title={assignment ? 'Read again: your predicted grade' : 'Read again'}
        done={secondRead !== null}>
        <AppButton
          title="Read value again"
          onPress={() => readValue('second-read')}
          loading={busy === 'second-read'}
          disabled={busy !== null || !characteristic.canRead}
        />
        {grade && <GradeBadge grade={grade} />}
        <ResultBox
          reading={secondRead}
          placeholder={
            assignment
              ? 'Write in step 2, then read again to see your grade'
              : 'Write in step 2, then read again to see the new value'
          }
        />
      </StepCard>

      {!assignment && (
        <AppButton
          title="Choose another characteristic"
          variant="secondary"
          onPress={() => select(null)}
          disabled={busy !== null}
        />
      )}
      <AppButton title="Disconnect" variant="quiet" onPress={disconnect} disabled={busy !== null} />
    </ScrollView>
  );
}

// Shows a value as text when it looks like text, otherwise as binary; always with its hex bytes
function ResultBox({ reading, placeholder }: { reading: Reading | null; placeholder: string }) {
  if (!reading) {
    return (
      <View style={styles.result}>
        <Text style={styles.resultPlaceholder}>{placeholder}</Text>
      </View>
    );
  }

  const hex = toHex(reading.base64);
  const text = decodeText(reading.base64);
  let shown = '(binary data)';
  if (hex === '') shown = '(empty value)';
  else if (text !== '' && isReadableText(text)) shown = text;

  return (
    <View style={styles.result}>
      <Text style={styles.resultValue} selectable>
        {shown}
      </Text>
      {hex !== '' && (
        <Text style={styles.resultHex} selectable numberOfLines={3}>
          {`HEX  ${hex}`}
        </Text>
      )}
      <Text style={styles.resultTime}>Read at {formatTime(reading.at)}</Text>
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
  note: { fontSize: 13, color: Colors.muted },
  written: { fontSize: 13, fontWeight: '700', color: Colors.text },
  result: { backgroundColor: Colors.surfaceRaised, borderRadius: Radius.sm, padding: Spacing.md, gap: Spacing.xs },
  resultValue: { fontSize: 16, color: Colors.text, textAlign: 'center' },
  resultHex: { fontFamily: MonoFont, fontSize: 12, color: Colors.muted, textAlign: 'center' },
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
