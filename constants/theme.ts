/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#65AE32';
const tintColorDark = '#65AE32';

export const Colors = {
  light: {
    text: '#11181C',
    textMuted: '#687076',
    background: '#fff',
    modalBackground: '#FAFAFA',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    positive: '#65AE32',
    positiveSurface: '#EAF3DE',
    negative: '#C42211',
    negativeSurface: '#FBE7E4',
    warning: '#B7791F',
    secondary: '#2A76B5',
    surface: '#F4F4F5',
    surfaceMuted: '#E4E4E7',
    border: '#E4E4E7',
    overlay: 'rgba(0,0,0,0.4)',
    onPrimary: '#FFFFFF',
    shadow: '#000000',
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#151718',
    modalBackground: '#1E2022',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    positive: '#65AE32',
    positiveSurface: '#1F2A17',
    negative: '#C42211',
    negativeSurface: '#2E1613',
    warning: '#E0A82E',
    secondary: '#2A76B5',
    surface: '#1F2123',
    surfaceMuted: '#27292B',
    border: '#2A2D2F',
    overlay: 'rgba(0,0,0,0.6)',
    onPrimary: '#FFFFFF',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ColorToken = keyof (typeof Colors)['light'];

export const Fonts = Platform.select({
  ios: {
    /** Lato, embedded via the expo-font config plugin. */
    sans: 'Lato',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Lato',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Lato, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
