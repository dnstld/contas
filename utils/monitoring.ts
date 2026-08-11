// This module IS the sanctioned Sentry wrapper the lint rule points everyone to,
// so it's the one place allowed to import Sentry directly.
// eslint-disable-next-line no-restricted-imports
import * as Sentry from '@sentry/react-native';

import { env } from '@/utils/env';
import { isExpectedConstraintError, isNetworkError } from '@/utils/error';

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
    // Central safety net. Transient connectivity drops are expected on mobile
    // and self-heal via onlineManager (see use-query-client.tsx) — they are
    // not actionable bugs, so drop them here rather than filing an issue per
    // dropped request. This also catches the raw unhandled-rejection path
    // (Sentry's global onunhandledrejection handler) that bypasses
    // captureError entirely and would otherwise report the original object
    // with a useless "Object captured as exception with keys: ..." title.
    beforeSend(event, hint) {
      const cause = hint?.originalException;
      // Transient network drops and expected constraint violations (e.g. a
      // duplicate name the user is already toasted about) are not actionable
      // bugs — drop them rather than filing an issue.
      if (isNetworkError(cause) || isExpectedConstraintError(cause)) return null;
      return event;
    },
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
  // Transient connectivity drops are expected on mobile and self-heal via
  // onlineManager (see use-query-client.tsx). They aren't actionable bugs, so
  // skip them at the source rather than filing an issue per dropped request.
  // (The beforeSend hook in initMonitoring is the backstop for network errors
  // that reach Sentry through other paths, e.g. unhandled rejections.)
  if (isNetworkError(error)) return;
  // Expected constraint violations (e.g. duplicate name, Postgres 23505) are
  // user-caused and already surfaced via a toast — not actionable in Sentry.
  if (isExpectedConstraintError(error)) return;
  Sentry.captureException(toReportableError(error), context);
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
