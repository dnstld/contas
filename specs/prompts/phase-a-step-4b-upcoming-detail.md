# Prompt — Phase A · Step 4b: Upcoming detail modal (static UI)

> Paste this to the coding agent. **Static UI only** — data from `data/__fixtures__/category-items.ts`. This makes the Upcoming summary card open a **modal** that lists the individual upcoming payments, each with a "Registrar" (Log) placeholder action. Follow the `app/(modals)/category-items.tsx` modal conventions.

## 1. Share the upcoming selection (avoid duplication)

Move the filter/sort currently inside `components/upcoming/upcoming-summary.tsx` into the fixtures module as an exported helper, and use it in both places:

```ts
// data/__fixtures__/category-items.ts
export function upcomingExpenseItems(): CategoryItem[] { /* non-archived, expense category, recurrence !== 'none', nextDueOn set, sorted by nextDueOn asc */ }
```

Refactor `UpcomingSummary` to call `upcomingExpenseItems()` (same behavior as now).

## 2. Route + registration

- Add to `constants/routes.ts`: `export function upcomingHref(): Href { return { pathname: '/upcoming' }; }`.
- Register `<Stack.Screen name="upcoming" />` in `app/(modals)/_layout.tsx`.
- In `components/upcoming/upcoming-summary.tsx`, replace the card's `// TODO(step 4b)` no-op `onPress` with `router.push(upcomingHref())`.

## 3. Modal — `app/(modals)/upcoming.tsx`

Mirror `category-items.tsx` structure:

- Root `<View style={[styles.root, { backgroundColor }]}>` with `useThemeColor({}, 'modalBackground')`.
- Modal title: `<Stack.Screen options={{ headerTitle: t('upcoming.title') }} />` (the layout supplies back + ✕).
- Rows from `upcomingExpenseItems()`, rendered via `SectionList variant="flat"` + `ListCardRow`/`SectionListRow` (`size="sm"`, `density="comfortable"`):
  - `leading` = `Avatar size="sm" name={item.name}` (cycle a `tone` per row like the summary card does).
  - `title` = item name.
  - `subtitle` = `t('upcoming.next', { date })` → "Próximo 5 ago", with `date` = `formatDate(parseDayStart(item.nextDueOn), { day: 'numeric', month: 'short' })`.
  - `text1` = `<PriceText value={item.defaultAmount} currency={currency} />` when `defaultAmount != null` (currency from `useWallet()`, fallback `'BRL'`).
  - `trailing` = a compact **"Registrar"** action: a `Pressable` + `Text` in the tint color (`useThemeColor({}, 'tint')`, `variant="caption"`, `weight="semibold"`), small padding, pressed `opacity: 0.6`. `onPress` = no-op placeholder `// TODO(phaseB): log this occurrence`.
- Optional: if an item's `nextDueOn` is before today (`parseDayStart` vs `useNow()`), show a small destructive-tone "Atrasado" `Badge` before the amount. (Only if any fixture item is overdue — fine if none are.)
- Empty state (shouldn't trigger with fixtures): `EmptyState` with `upcoming.empty.title/subtitle`.

Keep it to **expenses** for now (matches the summary card). Income upcoming is a later addition.

## 4. i18n

Add to all three `i18n/locales/{pt-BR,en,de}.json`:

- `upcoming.next` — pt-BR "Próximo {{date}}", en "Next {{date}}", de "Nächste {{date}}"
- `upcoming.logAction` — pt-BR "Registrar", en "Log", de "Buchen"  *(use this for the trailing action label)*
- `upcoming.overdue` — pt-BR "Atrasado", en "Overdue", de "Überfällig"  *(only if you add the overdue badge)*
- `upcoming.empty.title`, `upcoming.empty.subtitle`

## Constraints & acceptance

- No queries/mutations/Supabase. Both the card and the modal read the shared `upcomingExpenseItems()` fixture helper (no duplicated filter logic).
- Tapping the Upcoming card opens the `/upcoming` modal (title "Próximos", back + ✕), listing each upcoming payment with avatar, name, "Próximo {date}", amount, and a "Registrar" placeholder action.
- Dates via `parseDayStart`; amounts via `PriceText`/`formatCurrency`.
- Repo typecheck passes; ESLint clean; no console errors.
