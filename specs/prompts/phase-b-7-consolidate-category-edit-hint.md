# Prompt — Consolidate category editing to the Categories tab (move the hint, prune dead keys)

> Paste this to the coding agent. Category editing/deleting now lives only on the Categories tab (long-press). Remove long-press edit from the Overview grid, move the "Press and hold to edit" hint to the Categories tab, and prune dead i18n keys. Small, surgical changes.

## 1. Overview grid — remove long-press edit (and its hint)

In `app/(tabs)/(status)/index.tsx`:

- Remove `onEditCategory={handleCategoryLongPress}` from the `<CategoryGridControls … />`.
- Remove `onLongPress={handleCategoryLongPress}` from the `<CategoryCard … />`.
- Delete the now-unused `handleCategoryLongPress` callback (keep `handleCategoryPress` / other callbacks). Keep the category **create** flow (`onCreateCategory`/`handleCreateCategory`) and the `categoryFormBridge` subscription as-is.

Because `CategoryPicker` derives its hint from `showHint = !!onEdit && …`, dropping `onEditCategory` automatically removes the "Press and hold to edit" hint from Overview. Tapping a category on Overview still opens its detail; long-press no longer edits.

## 2. Categories tab — show the hint

In `app/(tabs)/categories/index.tsx`, in the **non-empty** list branch, add a small centered caption below the `SectionList` (inside the existing `ScrollView`, after the list) matching the app's hint style:

```tsx
<View style={styles.hint}>
  <Icon name="hand.tap" size={14} tone="textMuted" />
  <Text variant="caption" tone="textMuted">{t('category.pressAndHoldHint')}</Text>
</View>
```

Add the style:

```ts
hint: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingTop: 4,
},
```

(`Icon` and `Text` are already imported.) Only the non-empty branch shows it — the empty state stays message-only.

## 3. Prune dead i18n keys

- Remove `categoriesTab.addCategory` from all three `i18n/locales/{pt-BR,en,de}.json` (unused since the in-list create buttons were removed; header uses `common.addCategory`).
- Grep-verify and remove any other keys that this feature left dead (e.g. check whether `common.add` is still referenced anywhere; only remove it if it truly is not). Do not remove keys that are still in use.

## Acceptance

- Overview: long-press on a category does nothing (no edit); the "Press and hold to edit" hint is gone from Overview; tapping still opens the category detail; creating a category from Overview still works.
- Categories tab: a centered "Press and hold to edit" hint (with the hand-tap icon) shows under the list when categories exist; long-press still opens edit/delete.
- `categoriesTab.addCategory` removed from all locales; no other in-use key removed.
- Repo typecheck passes; ESLint clean; no console errors.
