# Prompt — Phase A · Step 3: Item form modal (static UI)

> Paste this to the coding agent. **Static UI only** — no queries, no mutations, no Supabase. Reuse the existing design system and mirror `app/(modals)/category-form.tsx` conventions (it's the closest analog). Builds on Steps 1–2.

## Goal

A modal to **create / edit a category item**, opened from the items modal. Fields: name, optional expected amount, recurrence, and — when recurring — a "next due" date. Recurrence is **open-ended only** (no end-date, no installment/"k of N" controls — per the plan's latest direction). Save/Archive/Delete are visual placeholders (no logic yet).

## 1. Route + registration

- Add to `constants/routes.ts` (mirror `walletsHref`/`categoryDetailHref`):

```ts
export function categoryItemFormHref(args: { categoryId: string; editId?: string }): Href {
  return {
    pathname: '/category-item-form',
    params: { categoryId: args.categoryId, ...(args.editId ? { editId: args.editId } : {}) },
  };
}
```

- Register `<Stack.Screen name="category-item-form" />` in `app/(modals)/_layout.tsx`.

## 2. Wire the openers (in `app/(modals)/category-items.tsx`)

- **Add item** button `onPress` → `router.push(categoryItemFormHref({ categoryId: id }))` (replace the `// TODO(step 3)` no-op).
- **Item row** `onPress` → `router.push(categoryItemFormHref({ categoryId: id, editId: item.id }))` (replace the `// TODO(step 3)` no-op).

(Modal-over-modal is fine — the app already stacks modals.)

## 3. Screen — `app/(modals)/category-item-form.tsx`

Mirror `category-form.tsx` structure: a `<Stack.Screen options={{ headerTitle }} />` + `ModalFormScaffold` with a footer.

- **Params:** `useLocalSearchParams<{ categoryId: string; editId?: string }>()`. `isEdit = !!editId`. In edit mode, resolve the item from `MOCK_CATEGORY_ITEMS` by `editId` and hydrate initial field state from it; in create mode start empty (recurrence `'none'`).
- **Modal title:** `t('categoryItemForm.editTitle')` when editing, else `t('categoryItemForm.createTitle')`.
- **Local state:** `name` (string), `amountCents` (number), `recurrence` (`Recurrence`), `nextDue` (`Date`, default today via `useNow()`/`new Date()`).
- **Fields** (reuse the exact styling from `CategoryFields` — labels are `Text variant="caption" tone="textMuted" weight="medium"` uppercased; inputs use `useModalChrome()` colors + `Fonts.sans` + `borderRadius: 10`):
  1. **Name** — `TextInput` like the category name field. `maxLength` from a new `ITEM_NAME_MAX_LENGTH = 40` in `constants/limits.ts`. Autofocus on create (same `setTimeout(...250)` focus trick as category-form).
  2. **Expected amount (optional)** — `CurrencyInput` exactly like the budget field in `CategoryFields` (currency from `useWallet().currency`; use `nextAmountCents` + `formatAmount` the same way). Label `t('categoryItemForm.amountLabel')`, plus a muted caption `t('categoryItemForm.amountCaption')` ("Opcional").
  3. **Recurrence** — `SegmentedControl<Recurrence>` with options `none · daily · weekly · monthly · yearly`, labels from `t('categoryItemForm.recurrence.{none|daily|weekly|monthly|yearly}')` (short words: Nenhuma / Diário / Semanal / Mensal / Anual). Label above it `t('categoryItemForm.recurrenceLabel')`.
  4. **Next due** — only when `recurrence !== 'none'`: the `DatePicker` atom (`value={nextDue}`, `onValueChange={setNextDue}`, `title={t('categoryItemForm.nextDueLabel')}`).

  **Do not** render any end-date / "repeat until" / installment controls.

- **Footer (visual only — no mutations):**
  - Create: a single primary `PressableButton` `label={t('categoryItemForm.save')}`, disabled when `name.trim()` is empty, `onPress` = `router.back()` placeholder with `// TODO(phaseB): create item`.
  - Edit: mirror category-form's action row — a destructive `PressableButton` `t('categoryItemForm.delete')` and the primary `t('categoryItemForm.save')` side by side, **plus** a secondary `PressableButton` `t('categoryItemForm.archive')`. All `onPress` = `router.back()` placeholders with `// TODO(phaseB)` comments. (Delete/Archive don't need confirmation dialogs yet.)

## 4. i18n

Add to all three `i18n/locales/{pt-BR,en,de}.json` under `categoryItemForm` (pt-BR primary, real translations):

- `createTitle` ("Novo item"), `editTitle` ("Editar item")
- `nameLabel`, `namePlaceholder`
- `amountLabel`, `amountCaption` ("Opcional")
- `recurrenceLabel`, and `recurrence.none|daily|weekly|monthly|yearly`
- `nextDueLabel` ("Próximo vencimento")
- `save`, `archive`, `delete`

## Constraints & acceptance

- No queries/mutations/Supabase; edit mode reads from the fixtures only. `useWallet`, `useModalChrome`, `useTranslation`, `useRouter`, `useLocalSearchParams`, `useNow` are fine.
- Category name in the **modal title**; the tab header is never touched.
- Open-ended recurrence only — no end-date/installment UI anywhere.
- Reuse `PressableButton`, `SegmentedControl`, `CurrencyInput`, `DatePicker`, `ModalFormScaffold`, `Text` from `@/components/ui`; field styling matches `CategoryFields`.
- Result: tapping **Add item** opens "Novo item" with empty fields; picking a recurrence reveals the Next-due date picker; tapping an existing item opens "Editar item" pre-filled (e.g. Netflix → name "Netflix", amount 39,90, Mensal, next-due 05/08) with Save/Archive/Delete. All actions just close the modal.
- Repo typecheck passes; ESLint clean; no unused imports/styles; no console errors.
