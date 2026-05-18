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
import { getKVStore } from '@/utils/kv-store';
import { captureError } from '@/utils/monitoring';
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
      captureError(error, { tags: { context: 'wallet' } });
      return;
    }
    if (data?.currency) setCurrencyState(data.currency);
    if (data?.name) setName(data.name);
  }, []);

  const resolve = useCallback(
    async (uid: string) => {
      const reqId = ++requestRef.current;
      const key = KEY_PREFIX + uid;
      const storage = await getKVStore();
      if (reqId !== requestRef.current) return;

      let cachedId: string | null = null;
      if (storage) {
        try {
          const raw = await storage.getItem(key);
          if (reqId !== requestRef.current) return;
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (typeof parsed === 'string') {
              cachedId = parsed;
              setWalletId(parsed);
            }
          }
        } catch {
          // ignore corrupt entries; fall through to RPC
        }
      }

      // Fetch all wallet_members rows visible to this user (RLS lets us see all
      // co-members of wallets we belong to). Pick the wallet with the most
      // members; ties broken by most-recent join. For a couples app, this means
      // a shared wallet always wins over an empty personal one.
      const { data: rows } = await supabase
        .from('wallet_members')
        .select('wallet_id, user_id, joined_at');
      if (reqId !== requestRef.current) return;

      if (rows && rows.length > 0) {
        const stats = new Map<string, { count: number; myJoinedAt: string }>();
        for (const row of rows) {
          const entry = stats.get(row.wallet_id) ?? { count: 0, myJoinedAt: '' };
          entry.count += 1;
          if (row.user_id === uid) entry.myJoinedAt = row.joined_at;
          stats.set(row.wallet_id, entry);
        }

        const mine = [...stats.entries()].filter(([, v]) => v.myJoinedAt);
        if (mine.length > 0) {
          mine.sort((a, b) => {
            if (b[1].count !== a[1].count) return b[1].count - a[1].count;
            return b[1].myJoinedAt.localeCompare(a[1].myJoinedAt);
          });

          // Honour the user's last manual selection if they're still a member.
          const cachedIsValid =
            cachedId != null && mine.some(([wid]) => wid === cachedId);
          const preferred: string = cachedIsValid && cachedId ? cachedId : mine[0][0];

          setWalletId(preferred);
          if (!cachedIsValid && storage) {
            try {
              await storage.setItem(key, JSON.stringify(preferred));
            } catch {
              // swallow — next launch will reconcile again
            }
          }
          fetchWalletData(preferred, reqId);
          return;
        }
      }

      // No memberships yet — bootstrap a personal wallet.
      const { data, error } = await supabase.rpc('get_or_create_default_wallet');
      if (reqId !== requestRef.current) return;
      if (error) {
        captureError(error, { tags: { context: 'wallet' } });
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
    },
    [fetchWalletData],
  );

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
        captureError(error, { tags: { context: 'wallet' } });
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
        getKVStore().then((storage) => {
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
