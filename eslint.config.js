// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // Build output, Expo caches, and throwaway git worktrees (e.g. under
    // `.claude/worktrees/`) are not project source — never lint them.
    ignores: ['dist/*', '.expo/**', '.claude/**', 'android/**', 'ios/**'],
  },
  // ------------------------------------------------------------------
  // Atomic-design layering: an `atoms/` file must not depend on anything
  // above it in the stack. Molecules can depend on atoms; organisms on both.
  // Feature components (components/<feature>/) and screens (`app/`) sit
  // above all of `components/ui/`.
  //
  // The list below is restrictive on imports *up* the stack only. Imports
  // from `react`, `react-native`, `@/utils/*`, `@/constants/*`, `@/hooks/*`
  // are still allowed everywhere (atoms still need `useThemeColor`).
  // ------------------------------------------------------------------
  {
    files: ['components/ui/atoms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/ui/molecules/*', '@/components/ui/organisms/*'],
              message: 'Atoms must not import molecules or organisms.',
            },
            {
              group: ['@/components/settings/*', '@/components/transactions/*'],
              message: 'Atoms must not depend on feature components.',
            },
            {
              group: ['@/hooks/use-finance*', '@/hooks/use-wallet*', '@/hooks/use-auth'],
              message: 'Atoms must not depend on domain hooks.',
            },
            {
              group: ['@/data/*', '@/utils/supabase'],
              message: 'Atoms must not depend on the data or backend layer.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['components/ui/molecules/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/ui/organisms/*'],
              message: 'Molecules must not import organisms.',
            },
            {
              group: ['@/components/settings/*', '@/components/transactions/*'],
              message: 'Molecules must not depend on feature components.',
            },
            {
              group: ['@/utils/supabase'],
              message: 'Molecules must not import the Supabase client directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['components/ui/organisms/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/settings/*', '@/components/transactions/*'],
              message: 'Organisms must not depend on feature components.',
            },
            {
              group: ['@/utils/supabase'],
              message: 'Organisms must not import the Supabase client directly.',
            },
          ],
        },
      ],
    },
  },
  // Don't reintroduce legacy components that have been deleted.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/themed-text',
              message:
                'ThemedText was removed. Use the typed `Text` atom (`@/components/ui/atoms/text`) instead.',
            },
            {
              name: '@/components/themed-view',
              message: 'ThemedView was removed. Compose a themed `View` with `useThemeColor`.',
            },
            {
              name: '@sentry/react-native',
              message:
                'Use `@/utils/monitoring` (captureError/captureMessage/setMonitoringUser) instead of importing Sentry directly.',
            },
          ],
          patterns: [
            {
              group: ['expo-sqlite/kv-store'],
              message: 'Use `getKVStore()` from `@/utils/kv-store` instead.',
            },
          ],
        },
      ],
    },
  },
]);
