# Prompt — Fix: Categories screen content renders behind the header

> Paste this to the coding agent. Bug: `app/(tabs)/categories/index.tsx` doesn't offset its content below the stack header, so the category list (and the "Expenses" label) render **behind** the translucent header — only the bottom button is visible. Fix it using the **same mechanism the other tabs already use** (`useHeaderHeight()` + a `flex: 1` container with `paddingTop: headerHeight`). **Do not** use a hardcoded padding number, a `SafeAreaView` hack, or any other workaround — match the existing pattern in `app/(tabs)/(status)/index.tsx` and `app/(tabs)/transactions/index.tsx`.

## The established pattern (copy it)

Both other tabs do:

```tsx
import { useHeaderHeight } from '@/hooks/use-header-height';
// ...
const headerHeight = useHeaderHeight();
// ...
<View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
  {/* scrollable content */}
</View>
```

with `container: { flex: 1 }`.

## Changes — `app/(tabs)/categories/index.tsx`

1. Import and call `useHeaderHeight()`.
2. Add `container: { flex: 1 }` to the styles.
3. Wrap **all three** return states in the header-offset container so nothing sits under the header:
   - **List state:** wrap the existing `ScrollView` in `<View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>…</View>` (the `ScrollView` keeps `contentContainerStyle={styles.content}`; it no longer needs its own `backgroundColor` since the container provides it).
   - **Empty state:** add `paddingTop: headerHeight` to the centered container (`[styles.emptyState, { backgroundColor, paddingTop: headerHeight }]`) so the message + create button center in the visible area below the header, not the full screen.
   - **Loading state:** add `paddingTop: headerHeight` to the centered spinner container likewise, for consistency.

## Acceptance

- After creating a category, the "Expenses" section label and the category row are fully visible below the header (nothing clipped behind it); the "New category" button sits at the bottom of the list as intended.
- Empty state (no categories) stays centered in the visible area below the header with its create button.
- Offset comes from `useHeaderHeight()` exactly like the Overview/Transactions tabs — no magic numbers or SafeArea workarounds.
- Repo typecheck passes; ESLint clean; no console errors.
