/**
 * Lazy, type-safe wrapper around `expo-sqlite/kv-store`.
 *
 * The native module is only present once the dev client has been rebuilt
 * after `npx expo install`, so we dynamically import it and fall back to an
 * in-memory shim in dev / web. Consumers see a single stable interface and
 * never need to interact with the `expo-sqlite/kv-store` types directly.
 */

import { captureError } from '@/utils/monitoring';

export type KVStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let storagePromise: Promise<KVStore | null> | null = null;

export function getKVStore(): Promise<KVStore | null> {
  if (storagePromise) return storagePromise;
  storagePromise = import('expo-sqlite/kv-store')
    .then((mod): KVStore | null => {
      const candidate = mod.default;
      if (!candidate) return null;
      // `expo-sqlite/kv-store` exposes a default export that satisfies the
      // `Storage`-like contract at runtime. We narrow it to our explicit type
      // here so callers don't see `unknown`.
      const store = candidate as unknown as KVStore;
      if (typeof store.getItem !== 'function' || typeof store.setItem !== 'function') {
        return null;
      }
      return store;
    })
    .catch((err: unknown) => {
      captureError(err, { tags: { source: 'kv-store-bootstrap' } });
      return null;
    });
  return storagePromise;
}
