import * as Sentry from '@sentry/react-native';

type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__,
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
