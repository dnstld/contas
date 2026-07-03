# Component 5 — App Shell (Tab Navigation + Global Header)

The app shell consists of the bottom tab navigation and the **global** stack header — a single header chrome rendered above every tab. It owns the cross-screen navigation surface and the project's primary entry point into the create flow.

Implementation is platform-aware: on iOS 26+ the tab bar uses Apple's liquid-glass material; on older iOS / Android it falls back to the system tab bar.

The header is implemented as a shared Stack layout (`components/navigation/app-stack-layout.tsx`) reused by every visible tab's `_layout.tsx` (each tab's `_layout.tsx` is a one-line `export { default } from '@/components/navigation/app-stack-layout'`). The shared layout exposes:

- a transparent stack header,
- a left wordmark showing the app name from key "common.appName" (value "Spendspacey"),
- a right "Add" button that pushes the `/create` modal.

All user-visible labels in the shell (tab labels, the "Add" button) are sourced from i18next and follow the active language — see the [Localization spec](localization.md).

## Scenarios

### Bottom tab bar — visible tabs

```
Given that the user is logged in
When the bottom tab bar is rendered
Then it must show exactly three visible tabs, in this order:
  1. Overview (route group "(status)") — label from key "tabs.balance";
     SF Symbol "chart.bar.fill" / drawable "ic_menu_sort_by_size" (en: "Overview")
  2. Transactions — label from key "tabs.transactions";
     SF Symbol "arrow.left.arrow.right" / drawable "ic_menu_recent_history" (en: "Transactions")
  3. Account — label from key "tabs.settings";
     SF Symbol "person.crop.circle.fill" / drawable "ic_menu_manage" (en: "Your account")
And the Overview tab must be selected by default
And each label must come from i18next via useTranslation, so the bar re-renders when the active language changes
And there is no UI Demo tab and no hidden Explore route in any build (dev or production)
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
And the same three tabs (Overview, Transactions, Account) must be present, with the same i18next-driven labels
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
Given that any visible tab is selected (Overview, Transactions, or Account)
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
Then the same screenOptions object (headerTransparent, empty headerTitle, no shadow, headerLeft wordmark, headerRight Add button) must be applied by every visible tab's _layout.tsx
And headerStyle.backgroundColor must be set from Colors[scheme].background so the header chrome matches the content
And the shared implementation must live in components/navigation/app-stack-layout.tsx
And each tab's _layout.tsx must re-export that default to avoid duplicating header config
And the modal group (app/(modals)) has its own _layout.tsx with a different header (centered title + close button)
  and is NOT part of this shared tab header
```

### Global header — wordmark (left)

```
Given that the global header is rendered on any tab
When the left header item is displayed
Then it must display the app name sourced from key "common.appName" — value "Spendspacey"
And the text must use the design-system Text atom with variant="subtitle" and weight="bold"
And the text must inherit the theme's primary text color (Colors[scheme].text)
And letter-spacing of 1.5 must be applied for a logo-like appearance
And no image asset must be rendered as the logo
And the wordmark must look and behave identically on every tab (Overview, Transactions, Account)
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
And the button must be tinted with the theme's primary tint color (Colors[scheme].tint)
And the icon and label must use the theme's onPrimary foreground color (white) for contrast
And the labelStyle('titleAndIcon') and fixedSize() modifiers must be applied so the label is not
  hidden in the header context and the button sizes to its content (not stretched)
And the button must render as a single capsule containing icon + label
```

### Global header — "Add" button (right) on Android / fallback

```
Given that the global header is rendered on Android (or any non-iOS platform) on any visible tab
When the right header item is displayed
Then it must render as a touchable pill with:
  - background color matching the theme's primary tint color (Colors[scheme].tint)
  - 999-point border radius (fully rounded pill)
  - a "plus" icon followed by the label from key "common.add"
  - onPrimary (white) icon and label
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

### Overview screen — top spacing under the global header

```
Given that the Overview screen (route group "(status)") is rendered with the transparent global header
When the screen's primary scrollable content is positioned
Then the first content element (TimeFilterBar) must appear immediately below the header
  with no extra padding beyond the system content-inset adjustment
And the content must scroll under the transparent header (so the header overlays the top of the content visually)
```

### Other tabs — content under the global header

```
Given that any non-Overview visible tab is rendered (Transactions, Account)
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
And the "Add" button tint must update to the new palette.tint
And the "Spendspacey" wordmark color must update to the new palette.text so it remains legible in both schemes
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

### Modal routes are off the tab header

```
Given that a modal route in app/(modals) is presented (e.g. /create, /edit, /category-select)
When the modal is on screen
Then it renders under the modal group's own header (centered title + a close/xmark button),
  NOT under the shared tab wordmark header
And the modal group is registered in the root stack with `presentation: 'modal'`, so it slides up
  over the active tab without joining the tab bar's ancestry
```

### Bootstrap gating

```
Given that the app launches (cold start)
When the root layout mounts
Then RootLayout must call initI18n() and gate the entire UI tree (including the tab bar and global header)
  behind the returned promise via an `i18nReady` state — it returns null until initI18n resolves
And no tab bar, header, or screen content must render before i18next has resolved the initial language
And once i18n is ready, RootLayout mounts the provider stack: AuthProvider → FinanceQueryProvider → WalletProvider → RootStack
And RootStack must additionally gate on auth + wallet loading:
  `const booting = authLoading || (!!session && walletLoading); if (booting) return null;`
  (the <AuthProvider> exposes `loading` while supabase.auth.getSession() resolves the persisted session;
   the <WalletProvider> exposes `loading: true` from when a session appears until walletId is resolved
   via the persisted per-user cache or resolve_default_wallet / get_or_create_default_wallet — see the
   [Authentication spec](authentication.md) → "Wallet provisioning after sign-in")
And while booting, the root stack must render null — no tab bar, no header, no auth screen flash
And if a session exists but wallet resolution failed with no wallet id (`session && walletError && !walletId`),
  RootStack must render an <ErrorFallback> retry screen instead of empty tabs (its reset calls wallet `refresh()`)
And once booted, route placement is declarative via <Stack.Protected>:
  - guard={!!session}  → renders the "(tabs)" screen and the "(modals)" group (presentation: "modal")
  - guard={!session}   → renders the "authentication" screen
And on that first eligible frame, the tab bar and global header render with the persisted language,
  and the dashboard's first paint is already scoped to the resolved walletId
```

### Authenticated context for the shell

```
Given that the tab bar and global header are rendered
When their scenarios reference "the user is logged in"
Then the precondition is satisfied whenever useAuth().session is non-null
  (see the [Authentication spec](authentication.md) for the gate's full behavior)
And whenever useAuth().session transitions to null (e.g. the user invokes signOut from the Account tab)
  the <Stack.Protected> guards in app/_layout.tsx flip: the "(tabs)" screen unmounts and the
  "authentication" screen mounts, so the tab bar and global header are no longer visible until a new session exists
```
