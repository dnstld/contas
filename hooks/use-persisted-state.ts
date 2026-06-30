import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import { getKVStore } from '@/utils/kv-store';
import { captureError } from '@/utils/monitoring';

// Cells hold heterogeneous values keyed by string, so the store is `unknown`
// and each consumer re-applies its own `T` at read time. The `value as T` casts
// below are an inherent trust boundary over persisted (JSON-parsed) data.
//
// Per-key Zod validation is deliberately deferred to Topic 6 (which owns this
// store): cells are global and shared by key, so a per-call `schema?` could only
// guard the read/hydration path — not in-session `update` writes (already typed
// `T`) nor a value another consumer wrote unvalidated. Adding it cleanly needs a
// store-level refactor, out of scope for the Topic 5 boundary pass.
//
// This is an external store read via `useSyncExternalStore`: `subscribe` adds to
// the cell's subscriber set, and `getSnapshot` reads `cell.value`. `hydrated`
// flips true once the async kv-store load (or default fallback) completes; until
// then `update` writes through to memory but not to the kv-store (so we never
// clobber a not-yet-read persisted value).
type Cell = {
  value: unknown;
  hydrated: boolean;
  subscribers: Set<() => void>;
};

const cells = new Map<string, Cell>();

// Lazily create the cell, seeding its value with `fallback` on first access.
// Called from `getSnapshot`/`subscribe`/`update`; the create-if-missing is
// idempotent and seed-once, so every later `getSnapshot` returns the same
// reference (a fresh `fallback` identity per render does NOT cause a render
// loop, because the existing cell's value is returned unchanged).
function getOrCreateCell(key: string, fallback: unknown): Cell {
  let cell = cells.get(key);
  if (!cell) {
    cell = { value: fallback, hydrated: false, subscribers: new Set() };
    cells.set(key, cell);
  }
  return cell;
}

// Write a hydrated value into the cell and notify all subscribers.
function commit(key: string, next: unknown): void {
  const cell = cells.get(key);
  if (!cell) return;
  cell.value = next;
  cell.hydrated = true;
  cell.subscribers.forEach((fn) => fn());
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void, { hydrated: boolean }] {
  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const cell = getOrCreateCell(key, defaultValueRef.current);
      cell.subscribers.add(onStoreChange);
      return () => {
        cell.subscribers.delete(onStoreChange);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getOrCreateCell(key, defaultValueRef.current).value as T,
    () => defaultValueRef.current,
  );
  const hydrated = useSyncExternalStore(
    subscribe,
    () => getOrCreateCell(key, defaultValueRef.current).hydrated,
    () => false,
  );

  // Async hydration: populate the cell from the kv-store (default-on-missing,
  // default-on-corrupt) and notify subscribers. Skips if another consumer (or
  // a prewarm) already hydrated this key. The `cancelled` flag guards against
  // the unmount/key-change race.
  useEffect(() => {
    const cell = getOrCreateCell(key, defaultValueRef.current);
    if (cell.hydrated) return;

    let cancelled = false;
    getKVStore().then((storage) => {
      if (cancelled) return;
      if (!storage) {
        commit(key, defaultValueRef.current);
        return;
      }
      storage
        .getItem(key)
        .then((raw) => {
          if (cancelled) return;
          if (raw != null) {
            try {
              commit(key, JSON.parse(raw) as T);
              return;
            } catch {
              // ignore corrupt entries
            }
          }
          commit(key, defaultValueRef.current);
        })
        .catch(() => {
          if (!cancelled) commit(key, defaultValueRef.current);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const cell = getOrCreateCell(key, defaultValueRef.current);
      const prev = cell.value as T;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      cell.value = resolved;
      cell.subscribers.forEach((fn) => fn());
      // Only persist once hydrated, so an early write doesn't clobber a value
      // the kv-store read hasn't returned yet.
      if (cell.hydrated) {
        getKVStore().then((storage) => {
          storage?.setItem(key, JSON.stringify(resolved)).catch((err) => {
            captureError(err, { tags: { context: 'kv-store' }, extra: { key } });
          });
        });
      }
    },
    [key],
  );

  return [value, update, { hydrated }];
}
