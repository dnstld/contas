# Component 10 — Authentication (Google Sign-In via Supabase)

The app gates all financial data behind Supabase Auth. The only sign-in method currently exposed is **Google**, using the native sign-in flow (`@react-native-google-signin/google-signin`) and passing the resulting ID token to `supabase.auth.signInWithIdToken`. The Supabase client persists sessions via `expo-sqlite/localStorage`, so a successful sign-in survives kill/relaunch.

Route protection is implemented declaratively in the root layout (`app/_layout.tsx`) with `<Stack.Protected guard={…}>`: the `(tabs)` + `(modals)` screens are guarded by `!!session`, and the `authentication` screen by `!session`. When the session changes, the guards flip and the correct screen mounts — there is no imperative `router.replace` and no `useSegments` gate.

All user-visible labels on the authentication and sign-out surfaces are sourced from i18next — see the [Localization spec](localization.md).

## Scenarios

### Auth provider mounts above the navigation tree

```
Given that the app boots (cold start)
When the root layout renders
Then it must wrap the navigation tree in <AuthProvider> (hooks/use-auth.tsx)
And the provider must, on mount, call supabase.auth.getSession() once to hydrate the initial session
And it must subscribe to supabase.auth.onAuthStateChange and update the session in state on every event
And it must unsubscribe on unmount
And the provider must expose `{ session, loading, signInWithGoogle, signOut }` via useAuth()
```

### Initial route gate

```
Given that the app boots and the auth context is still loading (getSession has not resolved)
When the root stack would render
Then it must render nothing (return null) while `loading === true`
And no tab content, modal, or auth screen must flash before the session is known
```

### Unauthenticated → authentication screen

```
Given that auth context has finished loading
And no session exists (session is null)
When the root stack renders
Then the `<Stack.Protected guard={!session}>` branch must be active, mounting the "authentication" screen
And the tabs/modals branch (guard={!!session}) must be inactive, so no tab content is reachable
```

### Authenticated → tabs

```
Given that auth context has finished loading
And a session exists (and, per the App Shell spec, wallet bootstrap has resolved)
When the root stack renders
Then the `<Stack.Protected guard={!!session}>` branch must be active, mounting the "(tabs)" screen
  and registering the "(modals)" group (presentation: "modal")
And the Overview tab must be the visible screen by default
```

### Session persistence across cold starts

```
Given that the user signed in successfully on a previous run
When the app cold starts
Then supabase.auth.getSession() must return the persisted session
And the route gate must keep the user on the tabs (no flash of the authentication screen)
And the session is stored via the localStorage polyfill installed by expo-sqlite/localStorage
  (configured in utils/supabase.ts at client creation time)
```

### Authentication screen — layout

```
Given that the user lands on /authentication
When the screen renders
Then it must use the theme's background color, centered vertically with the copy left-aligned
And it must display the welcome copy from i18next, top to bottom:
  - eyebrow: key "common.appName" — caption variant, semibold, tint tone (en: "Spendspacey")
  - headline: key "common.appTagline" — display variant, bold, heading (en: "Everyday spending, your space")
  - body: key "auth.welcome.body" — body variant, muted tone
    (en: "See where your money goes, one expense at a time.")
And below the copy must be a single Button (design-system atom) labelled from key "auth.signInWithGoogle"
  (en: "Sign in with Google" / pt-BR: "Entrar com o Google")
And the Button must use variant="primary", size="large", and systemImage="arrow.right.circle.fill"
And there is no separate "auth.welcome.title" key — the headline is the app tagline
```

### Sign-in trigger

```
Given that the user is on /authentication
When the user taps the Google sign-in button
Then the button must enter a disabled/submitting state until the flow resolves
And signInWithGoogle() must run the following sequence:
  1. await GoogleSignin.hasPlayServices()
  2. await GoogleSignin.signIn() — opens the system Google account chooser
  3. extract res.data.idToken; throw if missing
  4. await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
  5. throw on any returned Supabase error, and throw if no session came back
     (a missing session is also reported via captureMessage)
And on success, the onAuthStateChange listener in <AuthProvider> must receive a SIGNED_IN event,
  the guards flip, and the Overview tab becomes visible (after wallet bootstrap)
And user-cancelled sign-in (statusCodes.SIGN_IN_CANCELLED or IN_PROGRESS) must be swallowed silently
  (return without throwing — no error surfaced)
And on any other failure the error is reported via captureError and rethrown, and the AuthenticationScreen
  must surface it with an Alert: title from key "auth.errors.title", body from a mapped key —
  "auth.errors.playServices" (PLAY_SERVICES_NOT_AVAILABLE), "auth.errors.signInRequired" (SIGN_IN_REQUIRED),
  or "auth.errors.generic" otherwise
And in all cases the button must return to its enabled state once the flow settles
```

### Google sign-in configuration

```
Given that GoogleSignin is used
When hooks/use-auth.tsx initializes (module load)
Then it must call GoogleSignin.configure exactly once with:
  - webClientId: env.googleWebClientId (required)
  - iosClientId: env.googleIosClientId (optional)
  (both read via the @/utils/env wrapper, which sources EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID /
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)
And the native side must also have the reversed iOS client ID registered in app.json under
  plugins["@react-native-google-signin/google-signin"].iosUrlScheme
  (format: "com.googleusercontent.apps.<id-from-google-cloud>")
And both env vars must be present (and may be exposed publicly — they are OAuth client IDs, not secrets)
```

### Required prerequisites — Google Cloud Console

```
Given that Google sign-in is to work end-to-end
When the project is provisioned in Google Cloud Console
Then three OAuth 2.0 Client IDs must exist in the same project:
  1. Web application — used as `webClientId`; required for Supabase to validate the ID token server-side
  2. iOS — bundle identifier matching app.json (com.dnstld.contas)
  3. Android — package name matching app.json (com.dnstld.contas) plus the SHA-1 fingerprint
     of the keystore used to sign the build (development and production fingerprints both)
And the OAuth consent screen must have scopes openid, userinfo.email, userinfo.profile enabled
```

### Required prerequisites — Supabase Dashboard

```
Given that Google sign-in is to work end-to-end
When the Google provider is configured in Authentication → Providers
Then it must be Enabled
And the Web Client ID and Web Client Secret must be pasted into the primary fields
And the iOS and Android Client IDs must be added under "Authorized Client IDs", comma-separated, web first
And "Skip nonce check" must be ON
  (the iOS native flow has Google generate an internal nonce; Supabase would otherwise reject the ID token
   with AuthApiError: "Passed nonce and nonce in id_token should either both exist or not")
And the Web Client Secret must never be placed in a public env var or in the app bundle
```

### Required build constraint — dev client (no Expo Go)

```
Given that @react-native-google-signin/google-signin is a native module
When the app is run
Then it must run inside a development build, EAS dev build, or production build
And it must NOT run inside Expo Go (the native module is not registered in the Go runtime)
And any rebuild after changing app.json's google-signin plugin entry must run `npx expo prebuild --clean`
  before `npx expo run:ios` / `npx expo run:android`
```

### Sign-out

```
Given that a session exists
When the user invokes signOut() from useAuth (e.g. via the Settings → Account row)
Then the flow must:
  1. await GoogleSignin.signOut() — best effort; swallow the error if the user was not signed in natively
  2. await supabase.auth.signOut()
And the onAuthStateChange listener must receive a SIGNED_OUT event with session = null
And the route gate must redirect to /authentication
And the local persisted session must be cleared (Supabase's signOut does this automatically)
```

### Profile is auto-created on first sign-in

```
Given that a user signs in with Google for the first time
When supabase.auth.signInWithIdToken succeeds
Then a row in auth.users is created by Supabase
And the database trigger `on_auth_user_created` (see data-model spec) creates a matching row
  in public.profiles with the user's id, display_name, and avatar_url
And the display_name and avatar_url are derived from raw_user_meta_data with provider-shape coalesce:
  - display_name = coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'), nullified if blank
  - avatar_url   = coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'), nullified if blank
And subsequent sign-ins of the same user must NOT re-fire the trigger (auth.users insert is one-time)
```

### Backfilling profiles for pre-existing users

```
Given that an auth.users row exists from a sign-in that predates the data-model migration
When the migration is first deployed to that environment
Then the trigger does NOT retroactively create profile rows for existing users
And a one-time backfill SQL may be run by an operator for cleanliness (see README.md → "Backfilling profiles")
But the absence of a backfill is no longer fatal:
  public.get_or_create_default_wallet performs the same INSERT … ON CONFLICT DO NOTHING
  for the calling user before creating their wallet, so the first post-auth wallet bootstrap
  self-heals the missing profile row
  (see the get_or_create_default_wallet RPC scenario in the data-model spec)
And the trigger continues to handle every future sign-up automatically
```

### Wallet provisioning after sign-in

```
Given that the auth context has finished loading and a session exists
When the root layout mounts
Then the WalletProvider (hooks/use-wallet.tsx) must observe the new session and resolve the user's wallet:
  1. Read the persisted wallet id from kv-store key `wallet:selected-id:<session.user.id>`
     and apply it to context immediately if present (optimistic paint before the RPC resolves)
  2. Call supabase.rpc('resolve_default_wallet', { p_preferred: <cachedId> }) — the server-side
     heuristic honours the cached id when the caller is still a member, otherwise returns the wallet
     with the most members (tiebreaker: the caller's most recent join), or NULL when the user has no memberships
  3. If resolve returned a wallet id, adopt it (and persist it if it changed); then fetch that wallet's
     currency / name / show_revenue
  4. Only if resolve returned NULL, call supabase.rpc('get_or_create_default_wallet') to bootstrap a
     personal wallet, adopt + persist its id, and fetch its data
And a failed resolve settles `loading` to false and sets `error` (surfaced by the App Shell's ErrorFallback),
  rather than hanging the boot gate forever; `refresh()` retries
And the RootStack boot gate in app/_layout.tsx waits for wallet resolution:
  `const booting = authLoading || (!!session && walletLoading); if (booting) return null`
  (so the user never sees the tabs render before their wallet id is known)
And the persisted key is per-user so signing out and back in as a different account on the same device
  finds no cached value and bootstraps a fresh wallet for the new uid; the previous account's key
  remains in storage so re-signing back into it is instant
```

### Environment variables owned by this feature

```
Given that authentication is configured
When .env.local is inspected
Then the keys owned by this feature are:
  - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  — Web OAuth client id (public; safe to ship)
  - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID  — iOS OAuth client id (public; safe to ship)
And the following must NEVER appear with the EXPO_PUBLIC_ prefix:
  - The Web Client Secret (Supabase Dashboard only)
  - Any *_SECRET token
And rotating any secret that leaked into .env.local with EXPO_PUBLIC_ requires regenerating the secret
  in Google Cloud Console
```

### Localization

```
Given that the active language is one of the supported languages
When any authentication-related surface renders
Then every label must come from i18next under these keys:
  - common.appName            (welcome eyebrow — also the header wordmark)
  - common.appTagline         (welcome headline)
  - auth.welcome.body
  - auth.signInWithGoogle
  - auth.signOut
  - auth.errors.title / auth.errors.generic / auth.errors.playServices / auth.errors.signInRequired
    (surfaced via Alert on sign-in failure)
And there is no auth.welcome.title key anymore

Given that the user changes the active language while signed out
When the authentication screen re-renders
Then all of its labels must update in place without an app restart
```
