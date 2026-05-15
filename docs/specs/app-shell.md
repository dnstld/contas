# Component 5 — App Shell (Tab Navigation + Home Header)

The app shell consists of the bottom tab navigation and the per-tab header chrome. It owns the cross-screen navigation surface and the project's primary entry point into the "Adicionar" (create) flow.

Implementation is platform-aware: on iOS 26+ the tab bar uses Apple's liquid-glass material; on older iOS / Android it falls back to the system tab bar.

## Scenarios

### Bottom tab bar — visible tabs

```
Given that the user is logged in
And the app launches in a development build (__DEV__ is true)
When the bottom tab bar is rendered
Then it must show exactly two visible tabs, in this order:
  1. "Home" with the SF Symbol "house.fill" (drawable "ic_menu_home" on Android)
  2. "UI Demo" with the SF Symbol "sparkles" (drawable "ic_menu_view" on Android)
And the "Home" tab must be selected by default
```

### Bottom tab bar — production build

```
Given that the app is built in production mode (__DEV__ is false)
When the bottom tab bar is rendered
Then the "UI Demo" tab must NOT be visible
And only the "Home" tab must remain in the bar
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
And the same two tabs (Home, UI Demo when __DEV__) must be present
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

### Home header — placement and visibility

```
Given that the Home tab is selected
When the Home screen is rendered
Then a native stack header must be visible at the top of the screen
And the header must have a transparent background
And no shadow or divider line must be rendered under the header
And no title text must be rendered in the header center
And the content of the Home screen must scroll under the header (content-inset adjusted)
```

### Home header — wordmark (left)

```
Given that the Home header is rendered
When the left header item is displayed
Then it must display the text wordmark "CONTAS" in uppercase
And the text must use the design-system Text atom with variant="subtitle" and weight="bold"
And the text must inherit the theme's primary text color (Colors[scheme].text)
And letter-spacing of 1.5 must be applied for a logo-like appearance
And no image asset must be rendered as the logo
```

### Home header — "Adicionar" button (right) on iOS

```
Given that the Home header is rendered on iOS
When the right header item is displayed
Then it must render as a SwiftUI Button with both icon and label visible
And the icon must be the SF Symbol "plus"
And the label must read "Adicionar"
And the button must use the glassProminent button style
And the button must be tinted with the theme's positive color (Colors[scheme].positive)
And the icon and label must use white foreground color for contrast
And the button must size to its content (fixed size, not stretched)
And the button must render as a single capsule containing icon + label
```

### Home header — "Adicionar" button (right) on Android / fallback

```
Given that the Home header is rendered on Android (or any non-iOS platform)
When the right header item is displayed
Then it must render as a touchable pill with:
  - background color matching the theme's positive color
  - 999-point border radius (fully rounded pill)
  - a "+" icon followed by the text "Adicionar"
  - white icon and white label
And pressing it must show visual feedback (opacity 0.7 on press)
And it must include a hit slop of 8 points to ease touch targeting
```

### Home header — opening the create modal

```
Given that the Home header "Adicionar" button is visible
When the user taps the button
Then the app must navigate (push) to the /modal route
And the modal must present with the slide-from-bottom transition defined in app/_layout.tsx
And the Home screen must remain in the stack underneath
```

### Home screen — top spacing

```
Given that the Home screen is rendered with the transparent stack header
When the screen's primary scrollable content is positioned
Then the first content element (TimeFilterBar) must appear immediately below the header
  with no extra padding beyond the system content-inset adjustment
And the content must scroll under the transparent header (so the header overlays the top of the content visually)
```

### Theme tint propagation

```
Given that the app's color scheme changes (light ↔ dark)
When the tab bar and Home header are re-rendered
Then the tab bar tintColor must update to the new palette.tint
And the "Adicionar" button background tint must update to the new palette.positive
And the "CONTAS" wordmark color must update to the new palette.text so it remains legible in both schemes
```

### Header isolation per tab

```
Given that the user navigates between tabs
When the UI Demo tab is selected
Then the Home header must NOT be rendered on the UI Demo screen
And the UI Demo screen must continue to render its own internal layout unchanged

When the user navigates back to the Home tab
Then the Home header must reappear with logo and "Adicionar" button
```
