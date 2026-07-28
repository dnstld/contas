# Prompt — Phase A · Step 3c: single-source-of-truth `ModalActions` component

> Paste this to the coding agent. Goal: make **one** component own the entire modal bottom-actions region, so future changes happen in a single file. Preserve every modal's existing behavior — this is a refactor, not a behavior change. Modals with real logic (`category-form`, `edit-*`, `invite-member`, `wallets`, `category-select`) must keep working exactly as before.

## 1. New component — `ModalActions`

Create `components/ui/molecules/modal-actions.tsx` and export from the `@/components/ui` barrel. It composes the existing `PressableButton` (primary) and `ModalActionLink` (secondary) — do **not** duplicate their styles.

```tsx
export interface ModalPrimaryAction {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}
export interface ModalSecondaryAction {
  label: string;
  onPress: () => void;
  tone?: 'destructive' | 'muted'; // default 'muted'
  loading?: boolean;
  disabled?: boolean;
}
export interface ModalActionsProps {
  primary: ModalPrimaryAction;
  /** Rendered as stacked ModalActionLinks ABOVE the primary button. */
  secondary?: ModalSecondaryAction[];
  /** Optional caption shown above the actions (e.g. a delete warning), in the danger color. */
  warning?: string | null;
}
```

Render order (top → bottom): `warning` caption (if set; `Text variant="caption"`, `useThemeColor 'negative'`, centered) → each `secondary` as a `ModalActionLink` → the `primary` as a full-width `PressableButton variant="primary" size="large"`. Use a small vertical `gap`. This whole block is what each modal passes to `ModalFormScaffold`'s `footer`.

## 2. Adopt it everywhere (single source of truth)

Replace every modal's hand-assembled footer/inline-actions with `<ModalActions … />` in the `ModalFormScaffold` `footer` slot. Remove the now-redundant per-screen assembly (inline `ModalActionLink`s in the body, footer `PressableButton`s, local `actionRow` styles).

- **`category-item-form.tsx`** — `footer={<ModalActions primary={{ label: t('categoryItemForm.save'), onPress: handleSave, disabled: !canSave }} secondary={isEdit ? [{ label: t('categoryItemForm.archive'), onPress: () => router.back() /* TODO(phaseB) */, tone: 'muted' }, { label: t('categoryItemForm.delete'), onPress: () => router.back() /* TODO(phaseB) */, tone: 'destructive' }] : undefined} />}`. Delete the inline `ModalActionLink`s from the body.
- **`category-form.tsx`** — `primary` = the existing Save/Create button (same label/onPress/loading/disabled). `secondary` (edit mode only) = `[{ label: t('category.edit.delete'), onPress: handleDelete, tone: 'destructive', loading: isDeleting, disabled: isPending && !isDeleting }]`. Pass `warning={deleteWarning}`. Keep `handleDelete`/`performDelete`/`deleteWarning`/toasts/bridge emits unchanged; remove the inline `ModalActionLink` and the `deleteWarning` `Text`/`actionRow` styles now handled by `ModalActions`.
- **`edit-display-name.tsx`, `edit-wallet-name.tsx`, `invite-member.tsx`, `wallets.tsx`, and `category-select.tsx` (create-mode footer)** — convert each single-button footer to `footer={<ModalActions primary={{ label, onPress, loading, disabled }} />}`, mapping the existing button's exact props. No secondary actions. Behavior must be identical.

If any of these modals has a footer shape that doesn't map cleanly to one primary (+ optional secondaries), stop and flag it rather than guessing.

## 3. Keep the leaf components

`ModalActionLink` and `PressableButton` remain as-is; `ModalActions` uses them internally. Don't inline their styles into `ModalActions`.

## Constraints & acceptance

- `ModalActions` is the **only** place that lays out modal bottom actions; no modal hand-assembles a footer or inline action rows anymore.
- All existing modal behaviors are unchanged: `category-form` delete still shows its confirm dialog + has-transactions warning + toast; name/wallet/invite saves still work; `category-select` create still works.
- The item form keeps its no-center-title header (back + ✕) and its open-ended recurrence fields.
- Visually: each modal shows one full-width primary button, with any secondary/destructive actions stacked just above it.
- Repo typecheck passes; ESLint clean; no unused imports/styles; no console errors.
