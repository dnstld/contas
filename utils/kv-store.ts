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

/**
 * Structural guard for the `expo-sqlite/kv-store` default export. The native
 * module satisfies the `Storage`-like contract at runtime but isn't typed as
 * our explicit `KVStore`, so we validate the two methods we rely on here
 * instead of asserting through `unknown`.
 */
function isKVStore(value: unknown): value is KVStore {
  if (!value || typeof value !== 'object') return false;
  return (
    'getItem' in value &&
    typeof value.getItem === 'function' &&
    'setItem' in value &&
    typeof value.setItem === 'function'
  );
}

let storagePromise: Promise<KVStore | null> | null = null;

export function getKVStore(): Promise<KVStore | null> {
  if (storagePromise) return storagePromise;
  storagePromise = import('expo-sqlite/kv-store')
    .then((mod): KVStore | null => {
      const candidate = mod.default;
      return isKVStore(candidate) ? candidate : null;
    })
    .catch((err: unknown) => {
      captureError(err, { tags: { source: 'kv-store-bootstrap' } });
      return null;
    });
  return storagePromise;
}
