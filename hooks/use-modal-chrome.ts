import { useThemeColor } from '@/hooks/use-theme-color';

export interface ModalChrome {
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  danger: string;
  inputBackground: string;
  onPrimary: string;
}

/**
 * Shared theme tokens used by every text-input modal in the app. Consolidates
 * the 6–7 `useThemeColor({}, ...)` calls each modal would otherwise duplicate.
 */
export function useModalChrome(): ModalChrome {
  return {
    text: useThemeColor({}, 'text'),
    textMuted: useThemeColor({}, 'textMuted'),
    border: useThemeColor({}, 'border'),
    accent: useThemeColor({}, 'positive'),
    danger: useThemeColor({}, 'negative'),
    inputBackground: useThemeColor({}, 'surfaceMuted'),
    onPrimary: useThemeColor({}, 'onPrimary'),
  };
}
