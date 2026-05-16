# CONTAS

A personal-and-shared finance app built with Expo Router (file-based routing), Supabase (Postgres + Auth + RLS), and a SwiftUI/Jetpack-Compose-aware design system. The architecture supports shared wallets — one wallet can have multiple members (couple / family finance) — gated behind Google sign-in with per-row row-level security.

## Stack

- **Expo SDK 55** with the new architecture, Reanimated 4, custom screen transitions
- **Expo Router** with file-based routing and a custom `createBlankStackNavigator` from `react-native-screen-transitions`
- **Supabase JS** client persisted via `expo-sqlite/localStorage` (no AsyncStorage dependency)
- **Google native sign-in** via `@react-native-google-signin/google-signin` → `supabase.auth.signInWithIdToken`
- **i18next** + `expo-localization` for en / pt-BR
- **Tailwind-free**: design-system atoms (Button, Text, Toggle, …) wrap `@expo/ui/swift-ui` and `@expo/ui/jetpack-compose`

## Required tooling

| Tool | Why |
|---|---|
| **Node 20+** | Expo SDK 55 |
| **Xcode 16+** (macOS) | iOS dev builds — Google sign-in is a native module, Expo Go won't work |
| **Android Studio + JDK 17** | Android dev builds |
| **Docker Desktop** | Local Supabase stack (`supabase start`) |
| **Supabase CLI** ≥ 2.90 | Migrations (`supabase db reset`, `supabase db push`) |

> The app cannot run in **Expo Go**. The Google sign-in native module is only registered in dev / preview / production builds.

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Google OAuth (Google Cloud Console)

Create three OAuth 2.0 Client IDs under the **same** Google Cloud project:

1. **Web application** — used as `webClientId`; Supabase needs this to validate the ID token server-side.
2. **iOS** — bundle identifier `com.dnstld.contas`. Note the **iOS URL scheme** (Google calls it `REVERSED_CLIENT_ID`, format `com.googleusercontent.apps.<id>`).
3. **Android** — package name `com.dnstld.contas` + the SHA-1 fingerprint of the keystore used to sign your build. Run `eas credentials` to inspect the development and production fingerprints; add both.

OAuth consent screen scopes: `openid`, `userinfo.email`, `userinfo.profile`.

### 3. Configure Supabase Auth (Dashboard)

In **Authentication → Providers → Google**:

- Enable the provider
- Paste the **Web Client ID** and **Web Client Secret**
- Add the **iOS** and **Android** Client IDs to **Authorized Client IDs** (comma-separated, **web first**)
- Toggle **Skip nonce check** ON *(required for the iOS native flow — without this, sign-in fails with `AuthApiError: Passed nonce and nonce in id_token should either both exist or not`)*

### 4. Populate `.env.local`

Create `.env.local` at the repo root (already gitignored). All keys are **public** identifiers — safe to ship in the JS bundle:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<from step 2.1>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<from step 2.2>
```

> ⚠️ **Never** put `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET` (or any `_SECRET`) in `.env.local`. The `EXPO_PUBLIC_` prefix exposes the value to the JS bundle that ships to every user's device. Web secrets live **only** in the Supabase Dashboard. If a secret leaks, rotate it immediately in Google Cloud Console.

### 5. Wire up the iOS URL scheme

Open `app.json` and replace the `iosUrlScheme` placeholder under the `@react-native-google-signin/google-signin` plugin with the **REVERSED iOS client ID** from step 2.2:

```jsonc
{
  "expo": {
    "plugins": [
      // …
      [
        "@react-native-google-signin/google-signin",
        { "iosUrlScheme": "com.googleusercontent.apps.<your-id>" }
      ]
    ]
  }
}
```

### 6. Apply database migrations

```bash
supabase login                          # one-time
supabase link --project-ref <your-ref>  # one-time, links CLI to remote
supabase db push                        # applies supabase/migrations/* to the remote DB
```

This creates the `profiles`, `wallets`, `wallet_members`, `wallet_invitations`, `categories`, and `transactions` tables along with their RLS policies, triggers, and RPCs. See [docs/specs/data-model.md](docs/specs/data-model.md) for the full schema contract.

If your Supabase project already has authenticated users that signed in before the migration, they won't have a `profiles` row (the `on_auth_user_created` trigger only fires on INSERT). Backfill once:

```sql
insert into public.profiles (id, display_name, avatar_url)
select
  id,
  nullif(coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), ''),
  nullif(coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'), '')
from auth.users
on conflict (id) do nothing;
```

## Daily development

### Local Supabase stack

```bash
supabase start         # boots Postgres + Auth + Studio in Docker (~30 s)
supabase db reset      # re-applies all migrations against the local DB
supabase status        # shows URLs + the local publishable key
supabase stop          # shuts everything down
```

Studio (local): http://127.0.0.1:54323

### Run the app

```bash
npm run start                 # Metro bundler (attach a dev client)
# or
npx expo run:ios              # build + install + run on iOS
npx expo run:android          # build + install + run on Android
```

After changing `app.json` (e.g. tweaking a config plugin):

```bash
npx expo prebuild --clean
npx expo run:ios              # or run:android
```

### Lint / typecheck

```bash
npm run lint                  # expo lint
npx tsc --noEmit              # type-check without emitting
```

### EAS dev / preview / production builds

```bash
npm run build:dev:ios         # or build:dev:android
npm run build:preview:ios     # or build:preview:android
npm run build:prod:ios        # or build:prod:android
npm run build:prod:all        # both platforms, production
```

### Schema changes

```bash
supabase migration new <slug>      # create supabase/migrations/<ts>_<slug>.sql
# …write SQL into the file…
supabase db reset                  # verify locally
supabase db push                   # deploy to remote
```

> Never edit the remote database directly via Studio's SQL/Table editor. That bypasses the `supabase_migrations.schema_migrations` tracking table and `db push` will start failing.

## Project layout

```
app/                       Expo Router routes
  _layout.tsx              Root layout — i18n + AuthProvider + route gate
  authentication.tsx       Google sign-in screen
  (tabs)/                  Authenticated tab navigator
  (modals)/                Slide-from-bottom modal stack
components/ui/             Design-system atoms / molecules / organisms
hooks/
  use-auth.tsx             Auth context (session, signInWithGoogle, signOut)
  use-persisted-state.ts   Generic kv-store-backed state hook
i18n/locales/              en.json, pt-BR.json
supabase/
  config.toml              Local stack config (gitignored runtime in .temp/)
  migrations/              SQL migrations
utils/supabase.ts          Supabase client (uses expo-sqlite/localStorage)
docs/specs/                Behavior specifications (Given/When/Then)
AGENTS.md                  Instructions for AI agents working in this repo
```

## Documentation

Behavior specs live in [`docs/specs/`](docs/specs/). Recently added or updated:

- [authentication.md](docs/specs/authentication.md) — Google sign-in flow, session gating, sign-out
- [data-model.md](docs/specs/data-model.md) — Database schema, RLS, triggers, RPCs
- [settings.md](docs/specs/settings.md) — Settings tab (now includes the Account section)
- [localization.md](docs/specs/localization.md) — Language + currency contract
- [app-shell.md](docs/specs/app-shell.md) — Tab navigation + global header (now auth-gated)

[AGENTS.md](AGENTS.md) gives AI agents access to live Supabase documentation via `ssh supabase.sh` — handy when adding new schema features or wiring up new providers.

## Troubleshooting

### Sign-in fails with `Passed nonce and nonce in id_token should either both exist or not`

The iOS native Google flow generates its own nonce inside the ID token. Toggle **Skip nonce check** ON in the Supabase Dashboard under Authentication → Providers → Google. No app rebuild required.

### Sign-in fails with `DEVELOPER_ERROR` on Android

The SHA-1 fingerprint registered in Google Cloud Console doesn't match the keystore that signed the build. Run `eas credentials` to see EAS's fingerprint and update the Android OAuth Client in Google Cloud.

### `supabase db push` fails with `function gen_random_bytes(integer) does not exist`

The migration is missing a schema prefix on a `pgcrypto` function. Use `extensions.gen_random_bytes(...)` (not bare `gen_random_bytes(...)`). Hosted Supabase doesn't include the `extensions` schema in the default migration search path.

### `Cannot find native module 'GoogleSignin'` in the dev client

You're either running in Expo Go (not supported) or you rebuilt the JS without rebuilding the native side. Run `npx expo prebuild --clean` then `npx expo run:ios` / `run:android`.

### The auth screen flashes briefly then jumps to the tabs (or vice versa)

The root layout returns `null` while `useAuth().loading` is true *and* while i18n is initializing. If you see a flash, check that both gates are still in place in [app/_layout.tsx](app/_layout.tsx).
