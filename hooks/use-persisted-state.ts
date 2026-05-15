import { useCallback, useEffect, useRef, useState } from 'react';

type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let storagePromise: Promise<Storage | null> | null = null;

function getStorage(): Promise<Storage | null> {
  if (storagePromise) return storagePromise;
  storagePromise = import('expo-sqlite/kv-store')
    .then((mod) => (mod.default as unknown as Storage) ?? null)
    .catch(() => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[usePersistedState] expo-sqlite native module not available. ' +
            'Falling back to in-memory state. Rebuild the dev client to enable persistence.',
        );
      }
      return null;
    });
  return storagePromise;
}

type Cell = {
  value: unknown;
  hasValue: boolean;
  subscribers: Set<(value: unknown) => void>;
};

const cells = new Map<string, Cell>();

function getCell(key: string): Cell {
  let cell = cells.get(key);
  if (!cell) {
    cell = { value: undefined, hasValue: false, subscribers: new Set() };
    cells.set(key, cell);
  }
  return cell;
}

/**
 * Pre-load the given keys from kv-store into the in-memory cell cache so that
 * the first render of `usePersistedState(key, ...)` returns the stored value
 * synchronously (no hydration flicker). Safe to call before any consumer mounts.
 */
export async function prewarmPersistedState(keys: readonly string[]): Promise<void> {
  const storage = await getStorage();
  if (!storage) return;
  await Promise.all(
    keys.map(async (key) => {
      const cell = getCell(key);
      if (cell.hasValue) return;
      try {
        const raw = await storage.getItem(key);
        if (raw == null) return;
        cell.value = JSON.parse(raw);
        cell.hasValue = true;
      } catch {
        // ignore corrupt entries
      }
    }),
  );
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void, { hydrated: boolean }] {
  const cell = getCell(key);
  const initial = cell.hasValue ? (cell.value as T) : defaultValue;
  const [value, setValue] = useState<T>(initial);
  const hydratedRef = useRef(cell.hasValue);
  const [hydrated, setHydrated] = useState(cell.hasValue);

  const defaultValueRef = useRef(defaultValue);
  defaultValueRef.current = defaultValue;

  useEffect(() => {
    const cell = getCell(key);
    const listener = (next: unknown) => setValue(next as T);
    cell.subscribers.add(listener);

    if (cell.hasValue) {
      setValue(cell.value as T);
      hydratedRef.current = true;
      setHydrated(true);
      return () => {
        cell.subscribers.delete(listener);
      };
    }

    let cancelled = false;
    const apply = (next: T) => {
      if (cancelled) return;
      cell.value = next;
      cell.hasValue = true;
      cell.subscribers.forEach((fn) => fn(next));
      hydratedRef.current = true;
      setHydrated(true);
    };

    getStorage().then((storage) => {
      if (cancelled) return;
      if (!storage) {
        apply(defaultValueRef.current);
        return;
      }
      storage
        .getItem(key)
        .then((raw) => {
          if (cancelled) return;
          if (raw != null) {
            try {
              apply(JSON.parse(raw) as T);
              return;
            } catch {
              // ignore corrupt entries
            }
          }
          apply(defaultValueRef.current);
        })
        .catch(() => {
          apply(defaultValueRef.current);
        });
    });

    return () => {
      cancelled = true;
      cell.subscribers.delete(listener);
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const cell = getCell(key);
      const prev = (cell.hasValue ? cell.value : value) as T;
      const resolved =
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      cell.value = resolved;
      cell.hasValue = true;
      cell.subscribers.forEach((fn) => fn(resolved));
      if (hydratedRef.current) {
        getStorage().then((storage) => {
          storage?.setItem(key, JSON.stringify(resolved)).catch(() => {});
        });
      }
    },
    [key, value],
  );

  return [value, update, { hydrated }];
}
