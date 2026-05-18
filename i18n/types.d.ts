/**
 * Type-augments `react-i18next` so `t('foo.bar')` is checked against the keys
 * declared in `i18n/locales/en.json` at compile time.
 *
 * If you add a key in `en.json`, mirror it in `pt-BR.json`; missing
 * translations don't fail TypeScript but `t()` will fall back to English.
 */

import 'react-i18next';
import en from './locales/en.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
