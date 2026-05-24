# Component 7 — Design System (Liquid Glass Conventions)

The app commits to Apple's iOS 26+ Liquid Glass design language for all interactive surfaces, with consistent fallbacks on older iOS and Android (Material 3). These scenarios are the testable contract every glass-styled primitive must respect — useful as a basis for snapshot and visual-regression tests.

## Scenarios

### Button — primary variant (mutation / call-to-action)

```
Given that a Button atom is rendered with variant="primary" on iOS 26+
When the button is displayed
Then it must use the SwiftUI buttonStyle 'glassProminent'
And it must be tinted with the brand or contextual tint passed via the tint modifier
And the label and icon must use the configured foreground color (typically the theme background or white)
And the button must size to its content via fixedSize() (no horizontal stretching)
And no text or icon may be clipped
```

### Button — secondary variant (neutral surface)

```
Given that a Button atom is rendered with variant="secondary" on iOS 26+
When the button is displayed
Then it must use the SwiftUI buttonStyle 'glass' (translucent, not tinted)
And it must respect the same controlSize and fixedSize() guarantees as the primary variant
```

### Button — tertiary variant (text-only)

```
Given that a Button atom is rendered with variant="tertiary" on iOS
When the button is displayed
Then it must use the SwiftUI buttonStyle 'borderless'
And no glass material must be applied
And the label must use the theme's text foreground color
```

### Button — destructive variant

```
Given that a Button atom is rendered with variant="destructive" on iOS 26+
When the button is displayed
Then it must use the SwiftUI buttonStyle 'glassProminent'
And it must use the theme's negative tint color
And it must declare role="destructive" so iOS applies system destructive semantics
```

### Chip — selected vs unselected

```
Given that a Chip atom is rendered on iOS 26+
When the chip is unselected
Then it must use buttonStyle 'glass' with the variant-specific tint

When the chip is selected
Then it must use buttonStyle 'glassProminent' with the same tint
And the labelStyle modifier must be 'titleAndIcon' so any check icon is rendered
And the foreground color must shift to the contrast color for selected state
```

### Liquid-glass label rendering

```
Given that any SwiftUI Button or Chip on iOS uses systemImage + label
When the component is rendered in a navigation-bar / toolbar / header context
Then the modifier labelStyle('titleAndIcon') MUST be applied
  (iOS otherwise defaults to icon-only in those contexts, hiding the label)
And the fixedSize() modifier MUST be applied to prevent the host from clipping the content
```

### Custom glass surfaces — circle / pill / rounded rectangle

```
Given that a custom view applies the glassEffect modifier on iOS 26+
When the view is rendered
Then the modifier configuration must include:
  - glass.variant ∈ { 'regular', 'clear', 'identity' }
  - glass.interactive: boolean (true for tappable elements)
  - glass.tint?: optional color
  - shape: one of 'circle', 'capsule', 'rectangle', 'ellipse', 'roundedRectangle'
And when shape is 'roundedRectangle', cornerRadius must be provided
And the glassEffect must always be combined with explicit content sizing
  (either via font + padding modifiers, or via frame), otherwise the glass clips to zero size
```

### Tab bar — grouped liquid-glass capsule

```
Given that the NativeTabs container is rendered on iOS 26+
  (Expo SDK 56 / expo-router 56.x / react-native-screens 4.25.x)
When the tab bar appears at the bottom of the screen
Then the visible triggers must render inside a single grouped glass capsule
And the selected pill must be tinted with the theme's primary tint
And no explicit prop is required to enable the capsule —
  iOS 26 renders it automatically when the tab bar's parent is a native
  UINavigationController (expo-router's <Stack>)
And the (tabs) route MUST live at the root inside expo-router's <Stack>,
  NOT inside any JS-driven custom navigator
  (a non-native navigator parent prevents iOS 26 from rendering the capsule;
   selected pill still works but the grouped container does not)
And modal routes live in the app/(modals)/ group with their own _layout.tsx,
  presented via `presentation: 'modal'` on the group screen in the root layout —
  this keeps the modal group OFF the tab bar's ancestry chain
And BottomAccessory must NOT be used as a glass-trigger hack
  (only use it for real accessory content like a mini-player)
And blurEffect must NOT be set
  (it overrides the system liquid-glass material with a legacy UIBlurEffect)
And backgroundColor must NOT be set
  (it overrides the system glass with a solid color)
```

### Tint color semantics

```
Given that an interactive glass element is rendered
When the element communicates a navigation or selection action
Then it must use Colors[scheme].tint (brand color)

When the element communicates a mutation / create action
Then it must use Colors[scheme].positive (e.g. the "Adicionar" header button)

When the element communicates a destructive action
Then it must use Colors[scheme].negative
```

### Foreground contrast on tinted glass

```
Given that a glassProminent button is tinted (positive, negative, or other)
When the button content (icon, label) is rendered
Then the foreground color must provide AA-level contrast against the tinted background
And the foregroundStyle modifier must be explicitly applied
  (otherwise iOS may default to the accent color, producing low-contrast or unexpected hues)
```

### Cross-platform parity

```
Given that any glass primitive is rendered on iOS < 26 or Android
When the platform does not support liquid glass
Then the component must fall back to:
  - iOS pre-26: standard SwiftUI button styles (system rendering)
  - Android: Jetpack Compose Material 3 equivalents (FilledTonalButton, FilterChip, etc.)
And no crash, missing-style warning, or unstyled rectangle may appear
And the same semantic information (label, icon, action) must remain present
```

### Color scheme reactivity

```
Given that the user toggles the device color scheme between light and dark
When any glass primitive re-renders
Then its tint, foreground, and background must update from the new palette
And the visual identity (variant — primary/secondary/destructive) must remain consistent across schemes
```
