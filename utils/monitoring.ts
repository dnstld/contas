import * as Sentry from '@sentry/react-native';

import { env } from '@/utils/env';

type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
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

export function captureError(error: unknown, context?: CaptureContext) {
  Sentry.captureException(error, context);
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
