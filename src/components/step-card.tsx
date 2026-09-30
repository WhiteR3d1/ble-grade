import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Props = {
  step: number;
  title: string;
  done: boolean;
  children: ReactNode;
};

export function StepCard({ step, title, done, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, done && styles.badgeDone]}>
          <Text style={[styles.badgeText, done && styles.badgeTextDone]}>{done ? '✓' : step}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
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
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  badgeDone: { backgroundColor: Colors.accent },
  badgeText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  badgeTextDone: { color: Colors.onAccent },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
});
