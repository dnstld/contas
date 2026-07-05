export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

export function getErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const { code } = err;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

const NETWORK_ERROR_PATTERN = /network|fetch failed|failed to fetch/i;

/**
 * True for transient connectivity failures (device offline, request dropped
 * mid-flight, etc). Works on real `Error` instances as well as plain
 * Supabase/PostgREST-shaped error objects (`{ message, details, ... }`) that
 * never get wrapped in an `Error`.
 */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error) return NETWORK_ERROR_PATTERN.test(err.message);
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    for (const key of ['message', 'details'] as const) {
      const value = obj[key];
      if (typeof value === 'string' && NETWORK_ERROR_PATTERN.test(value)) return true;
    }
  }
  return false;
}

/**
 * Maps Supabase / Postgres errors to an i18n key under `common.errors.*`.
 * Raw `error.message` strings often leak schema details (constraint names,
 * column names) and are always English regardless of locale — never show them
 * to the user. Pass the original error to Sentry separately.
 */
export function mapSupabaseErrorKey(err: unknown): string {
  const code = getErrorCode(err);
  switch (code) {
    case '23505':
      return 'common.errors.duplicate';
    case '23503':
      return 'common.errors.relatedDataExists';
    case '23502':
      return 'common.errors.missingRequired';
    case '42501':
    case 'PGRST301':
      return 'common.errors.notAllowed';
    case 'PGRST116':
      return 'common.errors.notFound';
    default:
      break;
  }
  if (err instanceof Error && err.name === 'AbortError') return 'common.errors.cancelled';
  if (isNetworkError(err)) return 'common.errors.network';
  return 'common.errors.actionFailed';
}
