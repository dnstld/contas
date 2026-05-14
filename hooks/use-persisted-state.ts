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

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void, { hydrated: boolean }] {
  const [value, setValue] = useState<T>(defaultValue);
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStorage().then((storage) => {
      if (cancelled) return;
      if (!storage) {
        hydratedRef.current = true;
        setHydrated(true);
        return;
      }
      storage
        .getItem(key)
        .then((raw) => {
          if (cancelled) return;
          if (raw != null) {
            try {
              setValue(JSON.parse(raw) as T);
            } catch {
              // ignore corrupt entries
            }
          }
          hydratedRef.current = true;
          setHydrated(true);
        })
        .catch(() => {
          hydratedRef.current = true;
          setHydrated(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (hydratedRef.current) {
          getStorage().then((storage) => {
            storage?.setItem(key, JSON.stringify(resolved)).catch(() => {});
          });
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, { hydrated }];
}
