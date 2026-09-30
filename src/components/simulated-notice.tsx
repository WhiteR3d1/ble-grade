import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

// Shown in the web preview, where the device is simulated
export function SimulatedNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.title}>Web preview: simulated device</Text>
      <Text style={styles.text}>
        Browsers cannot use this Bluetooth library, so the web version talks to a fake device. Use the
        Android app with the real device for the assignment.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.muted,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: 2,
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  text: { fontSize: 13, color: Colors.muted, lineHeight: 18 },
});
