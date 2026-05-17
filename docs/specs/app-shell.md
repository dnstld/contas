# Component 5 — App Shell (Tab Navigation + Global Header)

The app shell consists of the bottom tab navigation and the **global** stack header — a single header chrome rendered above every tab. It owns the cross-screen navigation surface and the project's primary entry point into the create flow.

Implementation is platform-aware: on iOS 26+ the tab bar uses Apple's liquid-glass material; on older iOS / Android it falls back to the system tab bar.

The header is implemented as a shared Stack layout (`components/navigation/app-stack-layout.tsx`) reused by every visible tab's `_layout.tsx`. The shared layout exposes:
- a transparent stack header,
- a left wordmark showing the active wallet's name (falls back to "CONTAS" while loading),
- a right "Add" button that pushes the `/create` modal.

All user-visible labels in the shell (tab labels, the "Add" button) are sourced from i18next and follow the active language — see the [Localization spec](localization.md).

## Scenarios

### Bottom tab bar — visible tabs

```
Given that the user is logged in
And the app launches in a development build (__DEV__ is true)
When the bottom tab bar is rendered
Then it must show exactly four visible tabs, in this order:
  1. Status — label from key "tabs.balance"; SF Symbol "chart.bar.fill" / drawable "ic_menu_sort_by_size"
     (en: "Status" / pt-BR: "Status")
  2. Transactions — label from key "tabs.transactions"; SF Symbol "arrow.left.arrow.right" / drawable "ic_menu_recent_history"
     (en: "Transactions" / pt-BR: "Transações")
  3. Account — label from key "tabs.settings"; SF Symbol "person.crop.circle.fill" / drawable "ic_menu_manage"
     (en: "Account" / pt-BR: "Conta")
  4. UI Demo — label from key "tabs.uiDemo"; SF Symbol "sparkles" / drawable "ic_menu_view"
And the Status tab must be selected by default
And each label must come from i18next via useTranslation, so the bar re-renders when the active language changes
```

### Bottom tab bar — production build

```
Given that the app is built in production mode (__DEV__ is false)
When the bottom tab bar is rendered
Then the "UI Demo" tab must NOT be visible
And the bar must show exactly three tabs: Status, Transactions, and Account (sourced from the same i18next keys)
And no navigation to /ui-demo must be possible from the tab bar
```

### Bottom tab bar — hidden Explore route

```
Given that the bottom tab bar is rendered
When the tab list is inspected
Then the "Explore" route (app/(tabs)/explore.tsx) must NOT appear in the bar in any mode
And it must not be reachable by tapping any tab item
```

### Bottom tab bar — liquid glass appearance (iOS 26+)

```
Given that the app is running on iOS 26 or later
When the bottom tab bar is rendered
Then it must display the visible tabs as pills grouped inside a single liquid-glass capsule container
And the selected tab pill must adopt the theme's primary tint color (palette.tint)
And the bar must not become fully transparent when content is scrolled to the top edge
  (the grouped-glass capsule remains visible at all scroll positions)
And the bar must NOT minimize, shrink, or collapse on scroll in either direction
```

### Bottom tab bar — pre-iOS 26 and Android fallback

```
Given that the app is running on iOS < 26 or on Android
When the bottom tab bar is rendered
Then it must render with the platform's default native tab bar style
And no app crash or rendering error must occur due to liquid-glass-only props
And the same tabs (Status, Transactions, Account — plus UI Demo when __DEV__) must be present, with the same i18next-driven labels
And the selected tab must reflect the theme's primary tint
```

### Bottom tab bar — switching tabs

```
Given that the bottom tab bar is rendered
When the user taps a tab that is not currently selected
Then the app must navigate to that tab's root screen
And the selected-state indicator must move to the tapped tab
And the previously selected tab must lose its selected styling

When the user taps the currently selected tab
Then the screen must not change
(Tab change cannot be cancelled — there is no preventDefault on tabPress.)
```

### Global header — placement and visibility

```
Given that any visible tab is selected (Status, Transactions, Account, or UI Demo)
When that tab's screen is rendered
Then a native stack header must be visible at the top of the screen
And the header must have a transparent background
And no shadow or divider line must be rendered under the header
And no title text must be rendered in the header center
And the screen's primary content must scroll under the header (content-inset adjusted)
```

### Global header — shared implementation

```
Given that the global header is rendered above any visible tab
When the implementation is inspected
Then the same screenOptions object (transparent header, no title, no shadow, headerLeft, headerRight) must be applied by every visible tab's _layout.tsx
And the shared implementation must live in components/navigation/app-stack-layout.tsx
And each tab's _layout.tsx must re-export that default to avoid duplicating header config
And the explicit hidden /explore route is exempt — it has no _layout and therefore no global header
```

### Global header — wordmark (left)

```
Given that the global header is rendered on any tab
When the left header item is displayed
Then it must display the active wallet's name sourced from useWallet().name
And while the wallet is still loading (name is null), it must fall back to the text from key "common.appName" — value "CONTAS"
And the text must use the design-system Text atom with variant="subtitle" and weight="bold"
And the text must inherit the theme's primary text color (Colors[scheme].text)
And letter-spacing of 1.5 must be applied for a logo-like appearance
And no image asset must be rendered as the logo
And the wordmark must look and behave identically on every tab (Status, Transactions, Account, UI Demo)
```

### Global header — "Add" button (right) on iOS

```
Given that the global header is rendered on iOS on any visible tab
When the right header item is displayed
Then it must render as a SwiftUI Button with both icon and label visible
And the icon must be the SF Symbol "plus"
And the label must come from key "common.add" (en: "Add" / pt-BR: "Adicionar")
And the label must update when the active language changes
And the button must use the glassProminent button style
And the button must be tinted with the theme's positive color (Colors[scheme].positive)
And the icon and label must use white foreground color for contrast
And the button must size to its content (fixed size, not stretched)
And the button must render as a single capsule containing icon + label
```

### Global header — "Add" button (right) on Android / fallback

```
Given that the global header is rendered on Android (or any non-iOS platform) on any visible tab
When the right header item is displayed
Then it must render as a touchable pill with:
  - background color matching the theme's positive color
  - 999-point border radius (fully rounded pill)
  - a "+" icon followed by the label from key "common.add"
  - white icon and white label
And pressing it must show visual feedback (opacity 0.7 on press)
And it must include a hit slop of 8 points to ease touch targeting
```

### Global header — opening the create modal from any tab

```
Given that the global header "Add" button is visible on any tab
When the user taps the button
Then the app must navigate (push) to the /create route
And the modal must present with the slide-from-bottom transition defined in app/_layout.tsx
And the currently active tab's screen must remain in the stack underneath the modal
And after the modal is dismissed, the user must return to the same tab and the same screen state they were on before
```

### Status screen — top spacing under the global header

```
Given that the Status screen is rendered with the transparent global header
When the screen's primary scrollable content is positioned
Then the first content element (TimeFilterBar) must appear immediately below the header
  with no extra padding beyond the system content-inset adjustment
And the content must scroll under the transparent header (so the header overlays the top of the content visually)
```

### Other tabs — content under the global header

```
Given that any non-Status visible tab is rendered (Transactions, Account, UI Demo)
When the screen's primary content is laid out
Then it must respect the system content-inset adjustment so its content is not occluded by the transparent header
And on tabs whose root content is a ScrollView, the scrollable content must scroll under the header (the header overlays it visually)
And on tabs whose root content is a non-scrolling View with its own scrolling region below (e.g. Transactions, which has a static header block above a SectionList),
  the outer View must add a top padding equal to useHeaderHeight() so the static block (filter, total card) sits below the header
  while the inner scrolling region still scrolls within its bounds
And on tabs whose root content is a centered View (e.g. fallback placeholders), the content must remain centered with the header floating above
```

### Theme tint propagation

```
Given that the app's color scheme changes (light ↔ dark)
When the tab bar and global header are re-rendered
Then the tab bar tintColor must update to the new palette.tint
And the "Add" button background tint must update to the new palette.positive
And the "CONTAS" wordmark color must update to the new palette.text so it remains legible in both schemes
And this update must apply on every visible tab simultaneously (they share the same header implementation)
```

### Header consistency across tabs

```
Given that the user navigates between visible tabs
When the active tab changes
Then the global header must remain visible above the newly active tab
And the wordmark, "Add" button styling, and behavior must be visually identical on every tab
  (the only thing that changes on tab switch is the content area below the header — the header is shared)
```

### Hidden /explore route

```
Given that the /explore route exists but is hidden from the tab bar
When the route is reached programmatically
Then the global header is not rendered above it (explore has no nested layout)
And this is the only intentional exception to the global-header rule
```

### Bootstrap gating

```
Given that the app launches (cold start)
When the root layout mounts
Then it must call initI18n() and gate the entire UI tree (including the tab bar and global header) behind the returned promise
And no tab bar, header, or screen content must render before i18next has resolved the initial language
And the currency cell must also be pre-warmed during this same await window
  (so the first render of any monetary value already reflects the persisted choice)
And once initI18n resolves, the root layout must additionally gate on the auth context
  (the <AuthProvider> exposes `loading` while supabase.auth.getSession() resolves the persisted session)
And while the auth context is still loading, the root stack must render null — no tab bar, no header, no auth screen flash
And once a session is known to exist, the root layout must additionally gate on the wallet context
  (the <WalletProvider> exposes `loading: true` from when a session appears until walletId is resolved
   via the persisted per-user cache or get_or_create_default_wallet — see the
   [Authentication spec](authentication.md) → "Wallet provisioning after sign-in")
And while wallet bootstrap is still pending, the root stack must continue to render null
  (the gate is `if (authLoading || (session && walletLoading)) return null`)
And only after i18n, the auth context, and (when applicable) the wallet context have resolved
  must the route gate run and place the user on:
  - /authentication (if no session)
  - /(tabs)/(status) (if a session exists)
And on that first eligible frame, the tab bar and global header must render with the correct,
  persisted language and currency, and the dashboard's first paint is already scoped to the resolved walletId
```

### Authenticated context for the shell

```
Given that the tab bar and global header are rendered
When their scenarios reference "the user is logged in"
Then the precondition is satisfied whenever useAuth().session is non-null
  (see the [Authentication spec](authentication.md) for the gate's full behavior)
And whenever useAuth().session transitions to null (e.g. the user invokes signOut from the Account tab's profile card)
  the route gate in app/_layout.tsx must redirect to /authentication
  and the tab bar and global header must no longer be visible until a new session exists
```
