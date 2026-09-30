import { Platform } from 'react-native';

// Black & white theme: black is the base, white is the accent.
// Things that need attention (problems, the grade) are shown inverted: black on white.
export const Colors = {
  background: '#000000',
  surface: '#111111',
  surfaceRaised: '#1C1C1C',
  border: '#2E2E2E',
  borderStrong: '#FFFFFF',
  text: '#FFFFFF',
  muted: '#A3A3A3',
  accent: '#FFFFFF',
  onAccent: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const Radius = {
  sm: 8,
  md: 12,
};

export const MonoFont = Platform.select({ ios: 'Menlo', default: 'monospace' });
