import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'quiet';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      role="button"
      aria-disabled={inactive}
      aria-busy={loading}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={labelColors[variant]} />
      ) : (
        <Text style={[styles.label, { color: labelColors[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const labelColors: Record<Variant, string> = {
  primary: Colors.onAccent,
  secondary: Colors.text,
  quiet: Colors.text,
};

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: Colors.accent },
  secondary: { borderWidth: 1.5, borderColor: Colors.borderStrong },
  quiet: { borderWidth: 1, borderColor: Colors.border },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '600' },
});
