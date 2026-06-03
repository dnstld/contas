import { mapSupabaseErrorKey } from '@/utils/error';

export type QueryView<T> =
  | { kind: 'loading' }
  | { kind: 'error'; errorKey: string; retry: () => void }
  | { kind: 'stale'; data: T; errorKey: string; retry: () => void }
  | { kind: 'empty'; data: T }
  | { kind: 'ready'; data: T };

export interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

export function toQueryView<T>(
  query: QueryLike<T>,
  opts: { isEmpty: (data: T) => boolean },
): QueryView<T> {
  const retry = () => {
    void query.refetch();
  };
  if (query.data === undefined) {
    if (query.isError) {
      return { kind: 'error', errorKey: mapSupabaseErrorKey(query.error), retry };
    }
    return { kind: 'loading' };
  }
  if (query.isError) {
    return {
      kind: 'stale',
      data: query.data,
      errorKey: mapSupabaseErrorKey(query.error),
      retry,
    };
  }
  if (opts.isEmpty(query.data)) return { kind: 'empty', data: query.data };
  return { kind: 'ready', data: query.data };
}
