# Prompt — Per-screen header create button + category edit/delete via long-press

> Paste this to the coding agent. Two related changes: (1) make the shared header's create button context-aware per tab, and (2) move category create to that header while adding edit/delete via long-press on the category row. Follow existing patterns; no route-sniffing hacks — pass the action explicitly per tab.

## 1. `ListCardRow` — support long-press

In `components/ui/molecules/list-card-row.tsx`: add `onLongPress?: () => void` to `ListCardRowProps`; render the `Pressable` wrapper when **either** `onPress` or `onLongPress` is set, and pass `onLongPress` through to the `Pressable`. `SectionListRow` already spreads props, so it inherits this automatically.

## 2. Per-screen header create button — `components/navigation/app-stack-layout.tsx`

- Add a prop: `export default function AppStackLayout({ create = 'transaction' }: { create?: 'transaction' | 'category' | 'none' })`.
- Build the header action from `create`:
  - `'transaction'` → `HeaderCreateButton` with label `t('common.addTransaction')`, `onPress: () => router.push(ROUTES.createTransaction)`.
  - `'category'` → `HeaderCreateButton` with label `t('common.addCategory')`, `onPress: () => router.push(categoryFormHref({ bridgeId: 'header' }))`. (No bridge subscription needed — `useCreateCategory` patches/invalidates the categories cache, so the Categories list refreshes on its own.)
  - `'none'` → `headerRight: () => null` (no button).
- Pass the chosen label into `HeaderCreateButton` (make its `label` a prop instead of the hardcoded `t('common.add')`). Keep `HeaderLogo` as `headerLeft` in all cases.

### Wire the tabs

- `app/(tabs)/(status)/_layout.tsx` and `app/(tabs)/transactions/_layout.tsx`: leave as the plain re-export (default `'transaction'`).
- `app/(tabs)/categories/_layout.tsx`: replace the re-export with `export default function CategoriesStackLayout() { return <AppStackLayout create="category" />; }`.
- `app/(tabs)/account/_layout.tsx`: `export default function AccountStackLayout() { return <AppStackLayout create="none" />; }`.

### i18n

Add to all three locales: `common.addTransaction` (en "Transaction", pt-BR "Transação", de "Transaktion") and `common.addCategory` (en "Category", pt-BR "Categoria", de "Kategorie"). Leave `common.add` in place (still used elsewhere).

## 3. Categories tab — `app/(tabs)/categories/index.tsx`

- **Remove both in-list create buttons:** delete the `PressableButton` at the bottom of the list **and** the one in the empty state. The empty state becomes just the `EmptyState` message (centered as it is now). Category creation now happens only via the header "+ Category". Remove the `PressableButton` import if unused.
- **Long-press to edit/delete:** in `toRow`, add `onLongPress: () => router.push(categoryFormHref({ editId: category.id, bridgeId }))`. This opens the existing `category-form` in edit mode (name, budget, **Delete** with the has-transactions guard). Keep the existing `categoryFormBridge` subscription (its `deleted`/`created` → `refetch`) so the row disappears after a delete.
- Keep the row's `onPress` (opens the items modal) unchanged. Remove the now-unused `openCategoryForm` only if nothing references it.

## Acceptance

- Header create button reads **"＋ Transaction"** on Overview and Transactions, **"＋ Category"** on Categories, and is **hidden** on Your account.
- Tapping "＋ Category" opens the category form; the new category appears on the Categories tab automatically.
- Long-pressing a category row opens its edit form with working Save and Delete (delete blocked with the friendly warning when the category has transactions); the list updates after delete.
- No in-list "New category" buttons remain; empty state shows only the message.
- Repo typecheck passes; ESLint clean; no console errors.
