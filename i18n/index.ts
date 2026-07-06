import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { getKVStore } from '@/utils/kv-store';

import de from './locales/de.json';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

export function getDeviceLanguageTag(): string | null {
  // expo-localization is a native module — until the dev client is rebuilt
  // after `npx expo install`, the native side isn't present. Probe the expo
  // module registry before requiring the JS wrapper, so we never touch a
  // module that would throw "Cannot find native module 'ExpoLocalization'".
  const registry = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules;
  if (!registry || !registry['ExpoLocalization']) return null;
  try {
    const Localization = require('expo-localization') as typeof import('expo-localization');
    return Localization.getLocales()[0]?.languageTag ?? null;
  } catch {
    return null;
  }
}

export const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'de'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
export const LANGUAGE_STORAGE_KEY = 'settings:language';

const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
  de: { translation: de },
} as const;

export function isSupportedLanguage(tag: string | null | undefined): tag is SupportedLanguage {
  return !!tag && (SUPPORTED_LANGUAGES as readonly string[]).includes(tag);
}

function resolveInitialLanguage(stored: string | null): SupportedLanguage {
  if (isSupportedLanguage(stored)) return stored;
  const device = getDeviceLanguageTag();
  if (isSupportedLanguage(device)) return device;
  const prefix = device?.split('-')[0];
  const match = SUPPORTED_LANGUAGES.find((lng) => lng.split('-')[0] === prefix);
  return match ?? DEFAULT_LANGUAGE;
}

async function readStoredLanguage(): Promise<SupportedLanguage | null> {
  try {
    const storage = await getKVStore();
    const raw = storage ? await storage.getItem(LANGUAGE_STORAGE_KEY) : null;
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' && isSupportedLanguage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const stored = await readStoredLanguage();
    const initialLanguage = resolveInitialLanguage(stored);
    await i18n.use(initReactI18next).init({
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
      returnNull: false,
    });
  })();
  return initPromise;
}

export function changeLanguage(lng: SupportedLanguage): Promise<unknown> {
  return i18n.changeLanguage(lng);
}

export default i18n;
