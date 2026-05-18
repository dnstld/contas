# Architecture & contribution rules

This file is the source of truth for non-obvious project conventions. Read it before changing patterns.

## Stack

- Expo SDK 55, React Native 0.83, React 19 with React Compiler (auto-memoization is enabled — manual `useMemo`/`useCallback` is for *correctness only*, not micro-perf)
- Expo Router with `typedRoutes: true` — **always use typed routes** (`Href` / generated literal unions). Never pass a hand-written string to `router.push/replace/navigate`.
- TanStack Query for all server state.
- Supabase as the backend; types are auto-generated to [types/database.types.ts](types/database.types.ts) via `pnpm supabase:types:gen`.
- i18next + react-i18next; default `en`, supported `pt-BR`.
- Sentry via [utils/monitoring.ts](utils/monitoring.ts) wrapper.

## Package manager

**Always pnpm.** A stale `package-lock.json` may still exist — ignore it.

## Provider boot order (do not reorder)

```
<ErrorBoundary>
  <ThemeProvider>
    <AuthProvider>           // owns session, runs supabase auth listener
      <FinanceQueryProvider> // owns TanStack QueryClient + AppState invalidator
        <WalletProvider>     // depends on AuthProvider (reads userId)
          <RootStack />      // realtime hooks (useFinanceRealtime / useWalletRealtime) live here
```

Reordering will produce null-context crashes; `WalletProvider` reads `useAuth()` and the realtime hooks read both.

## TanStack Query policy: event-driven invalidation, no polling

`staleTime` is set to `Infinity` in [hooks/use-query-client.tsx](hooks/use-query-client.tsx). Do **not** add `refetchInterval`, periodic timers, or short staleTimes. Invalidate via:

1. Mutations' `onSuccess`
2. Supabase realtime subscriptions in [hooks/use-finance-realtime.ts](hooks/use-finance-realtime.ts)
3. AppState foreground transitions ([hooks/use-query-client.tsx](hooks/use-query-client.tsx))

Use the `*Keys` factories (e.g. `financeKeys.transactions(walletId)`) — never inline strings.

## Atomic Design

```
components/ui/atoms/      Lowest level. Use only React Native + theme tokens + other atoms.
components/ui/molecules/  Compose atoms. Avoid composing other molecules where possible.
components/ui/organisms/  Compose atoms + molecules. Avoid composing other organisms.
components/<feature>/     Feature-coupled components (settings/, transactions/, navigation/).
```

- Atoms must not import hooks beyond `useThemeColor`, and never import from `hooks/use-finance-*` etc.
- Feature components may use domain hooks (`useWallet`, `useFinance`, etc.) but should avoid embedding `supabase.from(...)` calls directly — prefer a hook in `hooks/`.

## Theming

- Colors live in [constants/theme.ts](constants/theme.ts). Tokens: `text`, `textMuted`, `background`, `modalBackground`, `tint`, `icon`, `tabIconDefault`, `tabIconSelected`, `positive`, `negative`, `surface`, `surfaceMuted`, `border`, `overlay`, `onPrimary`.
- **Never hardcode `'#fff'`, `'#000'`, or `rgba(0,0,0,X)`** in JSX or StyleSheet. Use `useThemeColor({}, 'onPrimary')` / `'overlay'`.
- Never strip `headerTransparent: true` from a stack screen; if you need a solid header background, set `headerStyle.backgroundColor = Colors[scheme].background` so it matches the screen content.

## Demo mode

- Toggled via `usePersistedState('settings:demo-mode', false)`.
- `useFinance()` branches on demo mode and returns `generateDemoFinance(currency)` from [data/finance-demo.ts](data/finance-demo.ts).
- When demo mode is on, all underlying queries are `enabled: false`.

## Wallet auto-selection heuristic

Lives in [hooks/use-wallet.tsx](hooks/use-wallet.tsx)'s `resolve()`. The user's manually-selected wallet (cached in `kv-store`) wins. Otherwise: the wallet with the most members; tiebreaker is most-recent `joined_at`. New users get `get_or_create_default_wallet()` RPC. *TODO: move the heuristic into a Postgres function so all clients agree.*

## Persisted state

- `usePersistedState<T>(key, default)` uses a module-level cell cache so multiple consumers of the same key share a value.
- Keys are global (not namespaced per user). Migrate to per-user keys before storing any user-identifying data.
- `prewarmPersistedState(keys)` can be called before mount to avoid hydration flicker.

## Limits

Centralised in [constants/limits.ts](constants/limits.ts): `MAX_WALLETS_PER_USER`, `TRANSACTION_DESCRIPTION_MAX_LENGTH`, `CATEGORY_NAME_MAX_LENGTH`, `DISPLAY_NAME_MAX_LENGTH`. Don't inline these numbers.

## Error monitoring

Only via [utils/monitoring.ts](utils/monitoring.ts) — `captureError`, `captureMessage`, `setMonitoringUser`. Never `import '@sentry/react-native'` directly in feature code. Don't swallow errors silently (no empty `catch {}`); at minimum log to `captureError`.

## i18n

- Add keys to **both** [i18n/locales/en.json](i18n/locales/en.json) and [i18n/locales/pt-BR.json](i18n/locales/pt-BR.json).
- No hardcoded user-facing strings in JSX.
- Use `useTranslation()` and `t('namespace.key')`. Brand name is `t('common.appName')`.

## File naming

- All filenames in `components/`, `app/`, `hooks/`, `data/`, `utils/` are **kebab-case**. PascalCase filenames are a bug — fix them.
- Hooks file names match the exported hook (`use-foo.ts` ⇒ `useFoo`).

## Liquid glass / iOS-specific UI

We are intentionally on Expo 55 stable. Do **not** add `BottomAccessory` hacks or experimental SwiftUI tab-bar tricks. Full liquid-glass tab-bar pills await Expo 56.

## Don't add

- Tests / test infrastructure unless explicitly asked.
- New screens under `(tabs)` that aren't user-facing. Dev/storybook screens belong in a separate `(dev)/` route group gated by `__DEV__`.
- Backward-compatibility shims, dead `_`-prefixed args, `// removed` comments.
