# Prompt — Phase A · Step 1: Categories tab (static UI)

> Paste this to the coding agent. Scope is **static UI only — no data fetching, no hooks, no mutations, no Supabase**. Everything renders from a fixtures module. Reuse the existing design system; do not invent new primitives.

---

## Goal

Add a new **Categories** bottom tab to the app. It shows the wallet's categories grouped into **Expenses** and **Income**, each row displaying the category name and how many items it has, with a chevron. Production-fidelity look using existing components, wired into the real tab bar so it's navigable on device. Tapping a row and the "add" affordance are visual placeholders for now (no navigation target yet — Step 2 wires them).

## 1. Types (type-only, no logic)

In `data/finance-types.ts`:

- Extend the `Recurrence` union to include `'yearly'`: `'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'`.
- Add a `CategoryItem` type:

```ts
export type CategoryItem = {
  id: string;
  categoryId: string;
  name: string;
  defaultAmount?: number;          // major units (like Category.monthlyBudget)
  recurrence: Recurrence;
  nextDueOn?: string;              // 'YYYY-MM-DD'
  recurrenceEndOn?: string;        // 'YYYY-MM-DD'; undefined = open-ended
  recurrenceTotalCount?: number;   // installment total, for "k of N"
  archivedAt?: string;             // ISO; set = archived
};
```

Do **not** add any query/hook/schema code. Types only.

## 2. Fixtures module

Create `data/__fixtures__/category-items.ts` exporting typed sample data used by every Phase-A screen:

- `MOCK_CATEGORIES: Category[]` — a realistic mix, e.g.:
  - Expenses: `Subscriptions`, `Bar / Café`, `Groceries`, `Housing`
  - Income: `Salary`, `Freelance`
- `MOCK_CATEGORY_ITEMS: CategoryItem[]` — several items so later screens have content, e.g. under Subscriptions: `Netflix` (monthly, amount 39.9, nextDueOn), `Apple` (monthly), `Amazon Prime` (yearly), `iPhone 15` (monthly, `recurrenceTotalCount: 12`), `Spotify` (archived — set `archivedAt`); a couple under Groceries/Bar with no recurrence; `Salary` under the income category (monthly). Use `pt-BR`-friendly example values.
- A small helper `itemCountByCategory(): Record<string, number>` (or an exported map) that counts **non-archived** items per `categoryId`, so the list can show counts without logic.

Keep amounts and dates plausible; ids can be stable string literals.

## 3. Navigation — new tab

- In `app/(tabs)/_layout.tsx`, add a 4th `NativeTabs.Trigger name="categories"` **between** `transactions` and `account`, mirroring the existing triggers (label `t('tabs.categories')`, icon `sf="folder.fill"` / a sensible `drawable`).
- Create `app/(tabs)/categories/_layout.tsx` that re-exports the shared stack layout, exactly like the other tabs:

```ts
export { default } from '@/components/navigation/app-stack-layout';
```

- Create `app/(tabs)/categories/index.tsx` (the screen, below).

## 4. Screen — `app/(tabs)/categories/index.tsx`

Mirror the structure/conventions of `app/(tabs)/account/index.tsx` and `app/(tabs)/transactions/index.tsx`:

- `useThemeColor({}, 'background')` for the `ScrollView`/list background; `useTranslation()` for all strings.
- Render the app's `SectionList` organism (`variant="card"`, `scrollEnabled` as appropriate) with two sections built from `MOCK_CATEGORIES`: **Expenses** (`type === 'expense'`) and **Income** (`type === 'income'`). Use section titles `t('categoriesTab.sections.expenses')` / `...income`. Hide the Income section if it has no rows.
- Each row uses `SectionListRow`/`ListCardRow` (`size="sm"`, `density="comfortable"` like the account screen):
  - `title` = category name
  - `text1` or `trailing` = item count (e.g. `t('categoriesTab.itemCount', { count })`) followed by a chevron `Icon` (`name="chevron.right"` or the codebase's equivalent).
  - `onPress` = a no-op placeholder for now (leave a `// TODO(step 2): navigate to items screen` comment). Do not create the target route yet.
- Add an **"Add category"** affordance in a visually final way — a header-right button (follow the `Stack.Screen`/header button pattern) or a trailing "+ New category" row — but wire its `onPress` to a **no-op placeholder** with a `// TODO(step 5): open category form` comment. No modal, no logic.
- Empty state: if `MOCK_CATEGORIES` is empty, render the `EmptyState` component with `t('categoriesTab.empty.*')` strings. (Keep the real fixtures non-empty; just include the branch.)

## 5. i18n

Add the new keys to **all three** locale files `i18n/locales/{pt-BR,en,de}.json` (pt-BR is primary — translate properly, don't leave English placeholders):

- `tabs.categories`
- `categoriesTab.sections.expenses`, `categoriesTab.sections.income`
- `categoriesTab.itemCount` (pluralized, e.g. `"{{count}} item"` / `"{{count}} itens"`)
- `categoriesTab.addCategory`
- `categoriesTab.empty.title`, `categoriesTab.empty.subtitle`

## Constraints & acceptance

- **No** `useCategories`, `useFinance`, Supabase, react-query, or any mutation. Data comes **only** from `data/__fixtures__/category-items.ts`.
- Reuse existing components from `components/ui` (barrel `@/components/ui`); match the visual language of the account/transactions screens. No new design primitives.
- `pnpm tsc` (or the repo's typecheck) passes; ESLint clean; no console errors.
- Result: a real 4th tab appears; opening it shows a card-grouped list of categories with item counts and chevrons; the add affordance and rows are present but inert (placeholders). Nothing else in the app changes behavior.
