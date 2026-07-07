import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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

import { ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY, normalizeCurrency, type SupportedCurrency } from '@/data/currency';
import { useAuth } from '@/hooks/use-auth';
import { walletKeys } from '@/hooks/use-wallet-list';
import i18n from '@/i18n';
import { getKVStore } from '@/utils/kv-store';
import { captureError } from '@/utils/monitoring';
import { supabase } from '@/utils/supabase';
import { toast } from '@/utils/toast';

type WalletContextValue = {
  walletId: string | null;
  name: string | null;
  currency: SupportedCurrency;
  showRevenue: boolean | null;
  loading: boolean;
  error: Error | null;
  switchWallet: (id: string) => void;
  refresh: (opts?: { announce?: boolean }) => Promise<void>;
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
  // Mirrors `walletId` so `resolve` can read the wallet that was active *before*
  // it re-resolves (used to detect a switch-away and announce the new wallet).
  const walletIdRef = useRef<string | null>(null);
  useEffect(() => {
    walletIdRef.current = walletId;
  }, [walletId]);

  // `error` is a terminal state: a failed `resolve` settles `loading` to false
  // (instead of hanging the boot gate forever) and surfaces the failure for the
  // error/retry UI (Topic 8). `refresh()` clears it on the next attempt.
  const loading = userId != null && walletId == null && error == null;

  const fetchWalletData = useCallback(
    async (wid: string, reqId: number): Promise<{ name: string | null } | null> => {
      const { data, error } = await supabase
        .from('wallets')
        .select('currency, name, show_revenue')
        .eq('id', wid)
        .single();
      if (reqId !== requestRef.current) return null;
      if (error) {
        captureError(error, { tags: { context: 'wallet' } });
        return null;
      }
      if (data?.currency) setCurrencyState(normalizeCurrency(data.currency));
      if (data?.name) setName(data.name);
      setShowRevenueState(data?.show_revenue ?? null);
      return { name: data?.name ?? null };
    },
    [],
  );

  // Called when the active wallet is replaced because the previous one vanished
  // (the user left it, deleted it, or a partner's deletion was approved). Sends
  // the user back to Overview and announces where they landed.
  const announceSwitch = useCallback((walletName: string | null) => {
    router.navigate(ROUTES.home);
    if (walletName) {
      toast.info(i18n.t('wallet.switchedToast', { wallet: walletName }));
    }
  }, []);

  const resolve = useCallback(
    async (uid: string, announce = false) => {
      const reqId = ++requestRef.current;
      // The wallet that was active before this re-resolution. When `announce`
      // is set and we land on a different wallet, it means the previous one
      // vanished and we should tell the user where they are now.
      const previousId = walletIdRef.current;
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
        const info = await fetchWalletData(resolvedId, reqId);
        if (reqId === requestRef.current && announce && resolvedId !== previousId) {
          announceSwitch(info?.name ?? null);
        }
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
      const info = await fetchWalletData(bootstrapped, reqId);
      if (reqId === requestRef.current && announce && bootstrapped !== previousId) {
        announceSwitch(info?.name ?? null);
      }
    },
    [fetchWalletData, announceSwitch],
  );

  useEffect(() => {
    if (!userId) {
      // On sign-out, synchronously clear wallet state so no stale wallet leaks
      // into the next session. This reset-on-dependency-change is the intended
      // use of a synchronous setState in an effect.
      /* eslint-disable react-hooks/set-state-in-effect */
      requestRef.current++;
      setWalletId(null);
      setName(null);
      setCurrencyState(DEFAULT_CURRENCY);
      setShowRevenueState(null);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    resolve(userId);
  }, [userId, resolve]);

  // A wallet's currency is fixed at creation and cannot be changed afterwards
  // (amounts are stored as integer cents with no FX conversion, so re-labelling
  // the currency would silently reinterpret every stored amount). The choice is
  // made once in the create-wallet form; the DB also rejects currency updates.

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
      async refresh(opts) {
        if (userId) await resolve(userId, opts?.announce ?? false);
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
