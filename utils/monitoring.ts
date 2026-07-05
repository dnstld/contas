import * as Sentry from '@sentry/react-native';

import { env } from '@/utils/env';
import { isNetworkError } from '@/utils/error';

type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
};

export function initMonitoring() {
  if (__DEV__ || !env.sentryDsn) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.appVariant,
    // Finance app: never let Sentry attach IPs/cookies/headers by default.
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeBreadcrumb(breadcrumb) {
      // Console breadcrumbs can echo logged finance data — drop them entirely.
      if (breadcrumb.category === 'console') return null;
      // Strip query strings from network breadcrumb URLs (REST filters can
      // carry wallet ids / emails). Keep path/method/status for debugging.
      const url = breadcrumb.data?.['url'];
      if (typeof url === 'string') breadcrumb.data!['url'] = url.split('?')[0];
      return breadcrumb;
    },
  });
}

// Sentry only recognizes real `Error` instances. Callers throughout the app
// throw plain Supabase/PostgREST-shaped objects (`{ code, details, hint,
// message }`), which Sentry can't read a message from — it falls back to a
// useless "Object captured as exception with keys: ..." title. Wrap those in
// a real Error so the actual message ends up in the issue title and is
// searchable, while keeping the original value for debugging.
function toReportableError(error: unknown): Error {
  if (error instanceof Error) return error;
  const raw = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
  const message =
    (raw && typeof raw['message'] === 'string' && raw['message']) ||
    (raw && typeof raw['details'] === 'string' && raw['details']) ||
    (typeof error === 'string' && error) ||
    'Unknown error';
  return new Error(message, { cause: error });
}

export function captureError(error: unknown, context?: CaptureContext) {
  // Losing connectivity mid-request is expected on mobile (TanStack Query's
  // onlineManager already refetches on reconnect — see use-query-client.tsx).
  // Report it for visibility but as `warning`, not `error`, so it doesn't
  // read as an actionable production bug or skew error-rate noise.
  const level = context?.level ?? (isNetworkError(error) ? 'warning' : undefined);
  Sentry.captureException(toReportableError(error), {
    ...context,
    level,
    tags: { ...context?.tags, ...(isNetworkError(error) ? { network: 'true' } : {}) },
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'error',
  context?: CaptureContext,
) {
  Sentry.captureMessage(message, { level, ...context });
}

// Send only the user id — never the email or other PII to Sentry.
export function setMonitoringUser(user: { id: string } | null) {
  Sentry.setUser(user);
}

export const ErrorBoundary = Sentry.ErrorBoundary;
export const wrap = Sentry.wrap;
