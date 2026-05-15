# Component 5 — App Shell (Tab Navigation + Home Header)

The app shell consists of the bottom tab navigation and the per-tab header chrome. It owns the cross-screen navigation surface and the project's primary entry point into the create flow.

Implementation is platform-aware: on iOS 26+ the tab bar uses Apple's liquid-glass material; on older iOS / Android it falls back to the system tab bar.

All user-visible labels in the shell (tab labels, the "Add" button) are sourced from i18next and follow the active language — see the [Localization spec](localization.md). The "CONTAS" wordmark on the Balance header is intentionally not translated; it is the app's brand mark.

## Scenarios

### Bottom tab bar — visible tabs

```
Given that the user is logged in
And the app launches in a development build (__DEV__ is true)
When the bottom tab bar is rendered
Then it must show exactly four visible tabs, in this order:
  1. Balance — label from key "tabs.balance"; SF Symbol "house.fill" / drawable "ic_menu_home"
     (en: "Balance" / pt-BR: "Balanço")
  2. Transactions — label from key "tabs.transactions"; SF Symbol "arrow.left.arrow.right" / drawable "ic_menu_recent_history"
     (en: "Transactions" / pt-BR: "Transações")
  3. Settings — label from key "tabs.settings"; SF Symbol "gearshape.fill" / drawable "ic_menu_preferences"
     (en: "Settings" / pt-BR: "Ajustes")
  4. UI Demo — label from key "tabs.uiDemo"; SF Symbol "sparkles" / drawable "ic_menu_view"
And the Balance tab must be selected by default
And each label must come from i18next via useTranslation, so the bar re-renders when the active language changes
```

### Bottom tab bar — production build

```
Given that the app is built in production mode (__DEV__ is false)
When the bottom tab bar is rendered
Then the "UI Demo" tab must NOT be visible
And the bar must show exactly three tabs: Balance, Transactions, and Settings (sourced from the same i18next keys)
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
And the same tabs (Balance, Transactions, Settings — plus UI Demo when __DEV__) must be present, with the same i18next-driven labels
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

### Balance header — placement and visibility

```
Given that the Balance tab is selected
When the Balance screen is rendered
Then a native stack header must be visible at the top of the screen
And the header must have a transparent background
And no shadow or divider line must be rendered under the header
And no title text must be rendered in the header center
And the content of the Balance screen must scroll under the header (content-inset adjusted)
```

### Balance header — wordmark (left)

```
Given that the Balance header is rendered
When the left header item is displayed
Then it must display the text wordmark from key "common.appName" — value "CONTAS" — in uppercase
And the text must use the design-system Text atom with variant="subtitle" and weight="bold"
And the text must inherit the theme's primary text color (Colors[scheme].text)
And letter-spacing of 1.5 must be applied for a logo-like appearance
And no image asset must be rendered as the logo
And the wordmark string must be identical in every supported language (it is the app's brand mark, not a translated label)
```

### Balance header — "Add" button (right) on iOS

```
Given that the Balance header is rendered on iOS
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

### Balance header — "Add" button (right) on Android / fallback

```
Given that the Balance header is rendered on Android (or any non-iOS platform)
When the right header item is displayed
Then it must render as a touchable pill with:
  - background color matching the theme's positive color
  - 999-point border radius (fully rounded pill)
  - a "+" icon followed by the label from key "common.add"
  - white icon and white label
And pressing it must show visual feedback (opacity 0.7 on press)
And it must include a hit slop of 8 points to ease touch targeting
```

### Balance header — opening the create modal

```
Given that the Balance header "Add" button is visible
When the user taps the button
Then the app must navigate (push) to the /create route
And the modal must present with the slide-from-bottom transition defined in app/_layout.tsx
And the Balance screen must remain in the stack underneath
```

### Balance screen — top spacing

```
Given that the Balance screen is rendered with the transparent stack header
When the screen's primary scrollable content is positioned
Then the first content element (TimeFilterBar) must appear immediately below the header
  with no extra padding beyond the system content-inset adjustment
And the content must scroll under the transparent header (so the header overlays the top of the content visually)
```

### Theme tint propagation

```
Given that the app's color scheme changes (light ↔ dark)
When the tab bar and Balanço header are re-rendered
Then the tab bar tintColor must update to the new palette.tint
And the "Adicionar" button background tint must update to the new palette.positive
And the "CONTAS" wordmark color must update to the new palette.text so it remains legible in both schemes
```

### Header isolation per tab

```
Given that the user navigates between tabs
When the Transactions, Settings, or UI Demo tab is selected
Then the Balance header must NOT be rendered on those screens
And each tab's screen must render its own internal layout unchanged

When the user navigates back to the Balance tab
Then the Balance header must reappear with the wordmark and the "Add" button
```

### Bootstrap gating

```
Given that the app launches (cold start)
When the root layout mounts
Then it must call initI18n() and gate the entire UI tree (including the tab bar) behind the returned promise
And no tab bar, header, or screen content must render before i18next has resolved the initial language
And the currency cell must also be pre-warmed during this same await window
  (so the first render of any monetary value already reflects the persisted choice)
And once initI18n resolves, the tab bar and Balance header must render with the correct, persisted language and currency on the very first frame
```
