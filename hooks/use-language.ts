import { useTranslation } from 'react-i18next';

import {
  changeLanguage,
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n';
import { usePersistedState } from '@/hooks/use-persisted-state';

const STORAGE_KEY = 'settings:language';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [stored, setStored, { hydrated }] = usePersistedState<SupportedLanguage | null>(
    STORAGE_KEY,
    null,
  );

  const current = isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;

  const setLanguage = (next: SupportedLanguage) => {
    setStored(next);
    void changeLanguage(next);
  };

  return {
    language: current,
    storedLanguage: stored,
    setLanguage,
    hydrated,
    supported: SUPPORTED_LANGUAGES,
  };
}
