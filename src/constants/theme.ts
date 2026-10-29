import { Platform } from 'react-native';

/**
 * Paleta de Habitat: mar Caribe (turquesa profundo), arena y coral.
 */
export const Colors = {
  light: {
    text: '#10262B',
    textSecondary: '#5B6E72',
    background: '#FBF8F3',
    card: '#FFFFFF',
    backgroundElement: '#F1ECE3',
    backgroundSelected: '#E4DCCF',
    border: '#E6DFD4',
    primary: '#0E5E6F',
    primarySoft: '#DCEFEE',
    onPrimary: '#FFFFFF',
    accent: '#F06A4A',
    accentSoft: '#FDE6DF',
    success: '#2E8B57',
    warn: '#A86400',
    warnSoft: '#FFF1D6',
    brisaBubble: '#E7F3F2',
    userBubble: '#0E5E6F',
  },
  dark: {
    text: '#EEF4F3',
    textSecondary: '#9DB2B4',
    background: '#0B1416',
    card: '#132024',
    backgroundElement: '#1A2B30',
    backgroundSelected: '#24393F',
    border: '#22353A',
    primary: '#4FB3B0',
    primarySoft: '#173436',
    onPrimary: '#06201F',
    accent: '#FF8A6B',
    accentSoft: '#3A221C',
    success: '#5CC48A',
    warn: '#F2B44C',
    warnSoft: '#3A2D14',
    brisaBubble: '#173033',
    userBubble: '#2C7F82',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 88 }) ?? 0;
export const MaxContentWidth = 820;
