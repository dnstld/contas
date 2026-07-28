# Prompt — Phase A · Step 3b: item-form title + unify modal bottom actions

> Paste this to the coding agent. Two changes: drop the item-form's center title, and standardize modal bottom actions to **one primary button + inline low-emphasis extras** across all modals. `category-form.tsx` has **real logic** — preserve its behavior, only move the Delete trigger. Everything else stays static.

## 1. Remove the item-form modal title

In `app/(modals)/category-item-form.tsx`, remove the `headerTitle` from its `<Stack.Screen options={...} />` (both create and edit). The modals layout already defaults `headerTitle` to `''`, so the header shows only the **back button** (which reads the parent modal's title, e.g. "Assinaturas") and the **✕** close button. If the `Stack.Screen` now sets nothing, remove it entirely.

## 2. New shared component — `ModalActionLink`

Create `components/ui/molecules/modal-action-link.tsx` and export it from the `@/components/ui` barrel:

```tsx
export interface ModalActionLinkProps {
  label: string;
  onPress: () => void;
  tone?: 'destructive' | 'muted'; // default 'muted'
  disabled?: boolean;
  loading?: boolean;
}
```

- Renders a **full-width, centered** `Pressable` + `Text` (variant `body`, weight `medium`), no border, no fill.
- Color: `useThemeColor({}, tone === 'destructive' ? 'negative' : 'textMuted')`.
- `paddingVertical: 14`; pressed/disabled → `opacity: 0.5`; when `loading`, show a small `ActivityIndicator` in the tone color instead of the label.
- `accessibilityRole="button"`, `accessibilityLabel={label}`, honors `disabled`.

This is the single, shared way every modal renders inline Delete/Archive/etc. actions.

## 3. `category-item-form.tsx` — one-button footer + inline extras

- **Footer** (`ModalFormScaffold` `footer`): just the single primary `PressableButton` `label={t('categoryItemForm.save')}` (disabled when `name.trim()` empty), full width. Remove the old edit-mode action row and the separate Archive button from the footer.
- **Inline extras** at the bottom of the form body (after the fields), **edit mode only**:
  - `<ModalActionLink tone="muted" label={t('categoryItemForm.archive')} onPress={() => router.back()} />` `// TODO(phaseB): archive`
  - `<ModalActionLink tone="destructive" label={t('categoryItemForm.delete')} onPress={() => router.back()} />` `// TODO(phaseB): delete`
  - Create mode shows neither.
- Update i18n so `categoryItemForm.archive` = "Arquivar item" and `categoryItemForm.delete` = "Excluir item" (pt-BR), with matching en/de.

## 4. `category-form.tsx` — same pattern, preserve behavior

This modal is **real** (uses `useDeleteCategory`, a confirm `Alert`, and a `deleteWarning` for the has-transactions case). Keep all handlers (`handleDelete`, `performDelete`, `deleteWarning`, toasts, bridge emits) exactly as-is. Only change the **presentation**:

- **Footer:** just the single primary `PressableButton` (Save/Create) — remove the Delete button and the two-column `actionRow` from the footer.
- **Inline (edit mode only), at the bottom of the form body:** `<ModalActionLink tone="destructive" label={t('category.edit.delete')} onPress={handleDelete} loading={isDeleting} disabled={isPending && !isDeleting} />`.
- Render the existing `deleteWarning` caption (if set) just above/below that inline link instead of in the footer.
- Remove the now-dead `actionRow`/`actionItem` styles if unused.

## Constraints & acceptance

- Every modal footer is now a **single full-width primary button**. Delete/Archive appear only as inline `ModalActionLink` rows in the form body (edit mode) — no clipped/3rd footer button anywhere.
- Item form shows **no center title** — back button + ✕ only.
- `category-form` delete still works exactly as before (confirm dialog, has-transactions warning, success toast/close) — only its position changed.
- `ModalActionLink` is the shared component used by both forms; no bespoke per-screen action styling.
- Repo typecheck passes; ESLint clean; no unused imports/styles; no console errors.
