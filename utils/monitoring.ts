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
    environment: 'production',
    tracesSampleRate: 0.2,
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

export function setMonitoringUser(user: { id: string; email?: string } | null) {
  Sentry.setUser(user);
}

export const ErrorBoundary = Sentry.ErrorBoundary;
export const wrap = Sentry.wrap;
