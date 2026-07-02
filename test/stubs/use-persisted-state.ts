/**
 * Vitest-only stand-in for `@/hooks/use-persisted-state`.
 *
 * `@/hooks/use-time-filter` imports the real hook at module scope purely to
 * type `TimeFilterState`/expose `MONTHS` — data-layer tests never call
 * `useTimeFilter()` itself. The real hook transitively pulls in
 * `@/utils/monitoring` (`@sentry/react-native`, unparseable Flow syntax
 * outside Metro) and `@/utils/env` (throws when `EXPO_PUBLIC_*` vars are
 * unset), so it can't load in a plain Node/Vitest environment. This stub
 * breaks that chain; see `vitest.config.ts`'s `resolve.alias`.
 */
export function usePersistedState<T>(
  _key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void, { hydrated: boolean }] {
  return [defaultValue, () => {}, { hydrated: true }];
}
