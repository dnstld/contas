/**
 * Centralized, validated access to public environment variables.
 *
 * Expo inlines `EXPO_PUBLIC_*` at build time; missing values surface as
 * `undefined` rather than throwing. Read them through this module so a
 * misconfigured build fails fast with a clear message instead of a
 * cryptic runtime crash deep inside Supabase / Sentry.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local (development) or via EAS secrets (preview/production).`,
    );
  }
  return value;
}

function optional(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env['EXPO_PUBLIC_SUPABASE_URL']),
  supabasePublishableKey: required(
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
  ),
  googleWebClientId: required(
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'],
  ),
  googleIosClientId: optional(process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID']),
  sentryDsn: optional(process.env['EXPO_PUBLIC_SENTRY_DSN']),
  appVariant:
    (process.env['EXPO_PUBLIC_APP_VARIANT'] as
      | 'development'
      | 'preview'
      | 'production'
      | undefined) ?? 'development',
} as const;
