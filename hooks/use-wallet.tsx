import { useQueryClient } from '@tanstack/react-query';
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

import { DEFAULT_CURRENCY, normalizeCurrency, type SupportedCurrency } from '@/data/currency';
import { useAuth } from '@/hooks/use-auth';
import { walletKeys } from '@/hooks/use-wallet-list';
import { getKVStore } from '@/utils/kv-store';
import { captureError } from '@/utils/monitoring';
import { supabase } from '@/utils/supabase';

type WalletContextValue = {
  walletId: string | null;
  name: string | null;
  currency: SupportedCurrency;
  showRevenue: boolean | null;
  loading: boolean;
  error: Error | null;
  switchWallet: (id: string) => void;
  refresh: () => Promise<void>;
  setCurrency: (next: SupportedCurrency) => Promise<void>;
  setShowRevenue: (next: boolean) => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

const KEY_PREFIX = 'wallet:selected-id:';

export function WalletProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();
  const [walletId, setWalletId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [showRevenue, setShowRevenueState] = useState<boolean | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const requestRef = useRef(0);

  // `error` is a terminal state: a failed `resolve` settles `loading` to false
  // (instead of hanging the boot gate forever) and surfaces the failure for the
  // error/retry UI (Topic 8). `refresh()` clears it on the next attempt.
  const loading = userId != null && walletId == null && error == null;

  const fetchWalletData = useCallback(async (wid: string, reqId: number) => {
    const { data, error } = await supabase
      .from('wallets')
      .select('currency, name, show_revenue')
      .eq('id', wid)
      .single();
    if (reqId !== requestRef.current) return;
    if (error) {
      captureError(error, { tags: { context: 'wallet' } });
      return;
    }
    if (data?.currency) setCurrencyState(normalizeCurrency(data.currency));
    if (data?.name) setName(data.name);
    setShowRevenueState(data?.show_revenue ?? null);
  }, []);

  const resolve = useCallback(
    async (uid: string) => {
      const reqId = ++requestRef.current;
      setError(null);
      const key = KEY_PREFIX + uid;
      const storage = await getKVStore();
      if (reqId !== requestRef.current) return;

      // Optimistic paint from kv-store so the UI has a wallet ID before the
      // RPC round-trip completes.
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

      // Single source of truth for the wallet-selection heuristic. The RPC
      // honors `p_preferred` when the caller is still a member of it,
      // otherwise picks the wallet with the most members (tiebreaker:
      // caller's most recent join). Returns NULL when the user has no
      // memberships yet.
      const { data: resolvedId, error: resolveErr } = await supabase.rpc(
        'resolve_default_wallet',
        cachedId ? { p_preferred: cachedId } : {},
      );
      if (reqId !== requestRef.current) return;
      if (resolveErr) {
        captureError(resolveErr, { tags: { context: 'wallet' } });
        setError(resolveErr);
        return;
      }

      if (resolvedId) {
        setWalletId(resolvedId);
        if (resolvedId !== cachedId && storage) {
          try {
            await storage.setItem(key, JSON.stringify(resolvedId));
          } catch {
            // swallow — next launch will reconcile again
          }
        }
        fetchWalletData(resolvedId, reqId);
        return;
      }

      // No memberships yet — bootstrap a personal wallet.
      const { data: bootstrapped, error: bootstrapErr } = await supabase.rpc(
        'get_or_create_default_wallet',
      );
      if (reqId !== requestRef.current) return;
      if (bootstrapErr) {
        captureError(bootstrapErr, { tags: { context: 'wallet' } });
        setError(bootstrapErr);
        return;
      }
      if (!bootstrapped) {
        const err = new Error('get_or_create_default_wallet returned no wallet');
        captureError(err, { tags: { context: 'wallet' } });
        setError(err);
        return;
      }
      setWalletId(bootstrapped);
      if (storage) {
        try {
          await storage.setItem(key, JSON.stringify(bootstrapped));
        } catch {
          // swallow — next launch will reconcile via RPC again
        }
      }
      fetchWalletData(bootstrapped, reqId);
    },
    [fetchWalletData],
  );

  useEffect(() => {
    if (!userId) {
      requestRef.current++;
      setWalletId(null);
      setName(null);
      setCurrencyState(DEFAULT_CURRENCY);
      setShowRevenueState(null);
      setError(null);
      return;
    }
    resolve(userId);
  }, [userId, resolve]);

  const setCurrency = useCallback(
    async (next: SupportedCurrency) => {
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
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
    },
    [walletId, currency, userId, qc],
  );

  const setShowRevenue = useCallback(
    async (next: boolean) => {
      if (!walletId) return;
      const previous = showRevenue;
      setShowRevenueState(next);
      const { error } = await supabase
        .from('wallets')
        .update({ show_revenue: next })
        .eq('id', walletId);
      if (error) {
        captureError(error, { tags: { context: 'wallet' } });
        setShowRevenueState(previous);
        throw error;
      }
      if (userId) qc.invalidateQueries({ queryKey: walletKeys.list(userId) });
    },
    [walletId, showRevenue, userId, qc],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      walletId,
      name,
      currency,
      showRevenue,
      loading,
      error,
      async refresh() {
        if (userId) await resolve(userId);
      },
      switchWallet(id) {
        if (!userId) return;
        // Bump the request id so any in-flight `resolve` for the previous
        // wallet bails out before applying its result — otherwise a slow RPC
        // could overwrite the just-switched-to wallet's name/currency.
        const reqId = ++requestRef.current;
        setWalletId(id);
        const cached = qc
          .getQueryData<{ id: string; name: string; currency: string }[]>(walletKeys.list(userId))
          ?.find((w) => w.id === id);
        setName(cached?.name ?? null);
        setCurrencyState(cached ? normalizeCurrency(cached.currency) : DEFAULT_CURRENCY);
        // show_revenue is not in the wallet-list cache; wait for fetchWalletData.
        setShowRevenueState(null);
        getKVStore()
          .then((storage) => storage?.setItem(KEY_PREFIX + userId, JSON.stringify(id)))
          .catch((err) => captureError(err, { tags: { context: 'wallet' } }));
        fetchWalletData(id, reqId);
      },
      setCurrency,
      setShowRevenue,
    }),
    [
      walletId,
      name,
      currency,
      showRevenue,
      loading,
      error,
      userId,
      resolve,
      setCurrency,
      setShowRevenue,
      fetchWalletData,
      qc,
    ],
  );

  return <WalletContext value={value}>{children}</WalletContext>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
