export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

export function getErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
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
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'common.errors.cancelled';
    if (/network|fetch failed|failed to fetch/i.test(err.message)) {
      return 'common.errors.network';
    }
  }
  return 'common.errors.actionFailed';
}
