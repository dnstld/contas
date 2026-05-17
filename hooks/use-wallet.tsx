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
  name: string | null;
  currency: string;
  loading: boolean;
  switchWallet: (id: string) => void;
  refresh: () => Promise<void>;
  setCurrency: (next: string) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const KEY_PREFIX = 'wallet:selected-id:';
const DEFAULT_CURRENCY = 'BRL';

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
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState<string>(DEFAULT_CURRENCY);
  const requestRef = useRef(0);

  const loading = userId != null && walletId == null;

  const fetchWalletData = useCallback(async (wid: string, reqId: number) => {
    const { data, error } = await supabase
      .from('wallets')
      .select('currency, name')
      .eq('id', wid)
      .single();
    if (reqId !== requestRef.current) return;
    if (error) {
      console.error('[wallet] wallet data fetch failed', error);
      return;
    }
    if (data?.currency) setCurrencyState(data.currency);
    if (data?.name) setName(data.name);
  }, []);

  const resolve = useCallback(async (uid: string) => {
    const reqId = ++requestRef.current;
    const key = KEY_PREFIX + uid;
    const storage = await getStorage();
    if (reqId !== requestRef.current) return;

    let cachedId: string | null = null;
    if (storage) {
      try {
        const raw = await storage.getItem(key);
        if (reqId !== requestRef.current) return;
        if (raw) {
          const parsed = JSON.parse(raw) as string;
          if (typeof parsed === 'string') {
            cachedId = parsed;
            setWalletId(parsed);
          }
        }
      } catch {
        // ignore corrupt entries; fall through to RPC
      }
    }

    if (cachedId) fetchWalletData(cachedId, reqId);

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
    if (data !== cachedId) fetchWalletData(data, reqId);
  }, [fetchWalletData]);

  useEffect(() => {
    if (!userId) {
      requestRef.current++;
      setWalletId(null);
      setName(null);
      setCurrencyState(DEFAULT_CURRENCY);
      return;
    }
    resolve(userId);
  }, [userId, resolve]);

  const setCurrency = useCallback(
    async (next: string) => {
      if (!walletId) return;
      const previous = currency;
      setCurrencyState(next);
      const { error } = await supabase
        .from('wallets')
        .update({ currency: next })
        .eq('id', walletId);
      if (error) {
        console.error('[wallet] setCurrency failed', error);
        setCurrencyState(previous);
        throw error;
      }
    },
    [walletId, currency],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      walletId,
      name,
      currency,
      loading,
      async refresh() {
        if (userId) await resolve(userId);
      },
      switchWallet(id) {
        if (!userId) return;
        setWalletId(id);
        setName(null);
        setCurrencyState(DEFAULT_CURRENCY);
        getStorage().then((storage) => {
          storage?.setItem(KEY_PREFIX + userId, JSON.stringify(id));
        });
        fetchWalletData(id, requestRef.current);
      },
      setCurrency,
    }),
    [walletId, name, currency, loading, userId, resolve, setCurrency, fetchWalletData],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
