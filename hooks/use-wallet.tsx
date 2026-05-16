import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/utils/supabase';

type WalletContextValue = {
  walletId: string | null;
  loading: boolean;
  switchWallet: (id: string) => void;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const KEY_PREFIX = 'wallet:selected-id:';

type KVStore = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
};

let storagePromise: Promise<KVStore | null> | null = null;
function getStorage(): Promise<KVStore | null> {
  if (storagePromise) return storagePromise;
  storagePromise = import('expo-sqlite/kv-store')
    .then((mod) => (mod.default as unknown as KVStore) ?? null)
    .catch(() => null);
  return storagePromise;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [walletId, setWalletId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loading = userId != null && walletId == null;

  const resolve = useCallback(async (uid: string) => {
    const reqId = ++requestRef.current;
    const key = KEY_PREFIX + uid;
    const storage = await getStorage();
    if (reqId !== requestRef.current) return;

    if (storage) {
      try {
        const raw = await storage.getItem(key);
        if (reqId !== requestRef.current) return;
        if (raw) {
          const cached = JSON.parse(raw) as string;
          if (typeof cached === 'string') setWalletId(cached);
        }
      } catch {
        // ignore corrupt entries; fall through to RPC
      }
    }

    const { data, error } = await supabase.rpc('get_or_create_default_wallet');
    if (reqId !== requestRef.current) return;
    if (error) {
      console.error('[wallet] get_or_create_default_wallet failed', error);
      return;
    }
    if (!data) return;
    setWalletId(data);
    if (storage) {
      try {
        await storage.setItem(key, JSON.stringify(data));
      } catch {
        // swallow — next launch will reconcile via RPC again
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      requestRef.current++;
      setWalletId(null);
      return;
    }
    resolve(userId);
  }, [userId, resolve]);

  const value = useMemo<WalletContextValue>(
    () => ({
      walletId,
      loading,
      async refresh() {
        if (userId) await resolve(userId);
      },
      switchWallet(id) {
        if (!userId) return;
        setWalletId(id);
        getStorage().then((storage) => {
          storage?.setItem(KEY_PREFIX + userId, JSON.stringify(id));
        });
      },
    }),
    [walletId, loading, userId, resolve],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
