# Prompt — Phase A · Step 4c: shared `SectionLabel`, reuse for Upcoming

> Paste this to the coding agent. Small consistency change: the "Upcoming" title must use the **same component** as the "Where it goes" category section label. Extract that inline label into one shared component and use it in both places. Static UI only.

## Context

The category section header (default "Where it goes" / "Despesas") is rendered **inline** inside `components/ui/organisms/category-picker.tsx` as:

```tsx
<Text variant="caption" tone="textMuted" weight="medium" style={styles.label /* letterSpacing: 0.8 */}>
  {title.toUpperCase()}
</Text>
```

Right now `UpcomingSummary` uses a different, larger heading (`Text variant="title" weight="bold" heading`). Make them the same.

## 1. New shared component — `SectionLabel`

Create `components/ui/molecules/section-label.tsx` and export from the `@/components/ui` barrel:

```tsx
export interface SectionLabelProps {
  label: string;
  style?: StyleProp<ViewStyle>; // optional passthrough
}
```

- Renders `<Text variant="caption" tone="textMuted" weight="medium" style={[{ letterSpacing: 0.8 }, style]}>{label.toUpperCase()}</Text>`.
- It owns the uppercasing (callers pass the raw, already-translated string).

## 2. Use it in `CategoryPicker`

Replace the inline title `Text` in `category-picker.tsx` with `<SectionLabel label={title} />` (pass the raw `title`; the component uppercases). Keep the surrounding `titleGroup`/badge/clear layout unchanged. Remove the now-unused `styles.label` if nothing else uses it.

## 3. Use it in `UpcomingSummary`

In `components/upcoming/upcoming-summary.tsx`, replace the current big-bold title `Text` with `<SectionLabel label={t('upcoming.title')} />`. So the home screen's "PRÓXIMOS" label now matches the "DESPESAS"/"Where it goes" label exactly.

## Constraints & acceptance

- The Upcoming section label and the category section label render via the **same** `SectionLabel` component (identical style: uppercased, muted, `caption`, `weight="medium"`, `letterSpacing: 0.8`).
- `CategoryPicker` looks unchanged (same label as before, now via the shared component).
- No behavior changes elsewhere; static UI only.
- Repo typecheck passes; ESLint clean; no unused styles/imports; no console errors.
