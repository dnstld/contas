# Prompt — Phase B · Step 4: Upcoming forecast on real data (+ remove fixtures)

> Paste this to the coding agent. Replace the fixture-backed Upcoming card + modal with a **calendar-driven forecast** computed from real `category_items`. Add a pure `buildUpcoming` helper with unit tests. After this, nothing uses the fixtures module, so delete it.

## 1. Forecast helper — `data/finance-aggregations.ts`

Add pure, testable functions (timezone-safe: use `parseDayStart` / `toDayString` from `finance-types`, never `new Date('YYYY-MM-DD')`):

```ts
export interface UpcomingOccurrence { item: CategoryItem; dueOn: string; } // 'YYYY-MM-DD'
```

- `nextOccurrenceOnOrAfter(anchor: string, recurrence: RecurringRecurrence, from: Date): string` — roll the anchor forward to the first occurrence on/after `from`:
  - `daily`: `from` if anchor ≤ from, else anchor.
  - `weekly`: step +7 days from the anchor until ≥ from (preserves weekday).
  - `monthly`: step whole months, **clamping** the anchor day to the month length (e.g. day 31 → Feb 28/29).
  - `yearly`: step whole years, clamping Feb 29 → Feb 28 on non-leap years.
- `buildUpcoming(items: CategoryItem[], categories: Category[], now: Date, windowDays = 30): UpcomingOccurrence[]`:
  - Consider only items that are **not archived**, have `recurrence !== 'none'` and a `nextDueOn`, and whose category (looked up in `categories`) has `type === 'expense'`.
  - For each, compute `dueOn = nextOccurrenceOnOrAfter(nextDueOn, recurrence, todayStart)` where `todayStart = parseDayStart(toDayString(now))`.
  - Keep occurrences with `dueOn <= today + windowDays`. One occurrence per item (its next within the window).
  - Return sorted by `dueOn` ascending.

## 2. Unit tests — `data/__tests__/upcoming.test.ts`

Mirror the existing aggregation tests. Cover: monthly month-end clamping (Jan 31 → Feb 28/29), weekly stepping, yearly leap-day clamp, past-anchor roll-forward to today, the 30-day window boundary (include == today+30, exclude beyond), archived excluded, income-category items excluded, `recurrence: 'none'` excluded.

## 3. Wire the summary card — `components/upcoming/upcoming-summary.tsx`

- Replace `upcomingExpenseItems()` with `buildUpcoming(useCategoryItems().data ?? [], useCategories().data ?? [], useNow())`.
- `count` = occurrences length; `total` = sum of `occ.item.defaultAmount ?? 0`; `nextDate` = first occurrence's `dueOn`; avatars = first 3 occurrences' `item.name`, plus `+N`.
- `count === 0` → render nothing (unchanged).

## 4. Wire the detail modal — `app/(modals)/upcoming.tsx`

- Replace `upcomingExpenseItems()` with `buildUpcoming(...)`; render one row per occurrence: avatar (`occ.item.name`), title = `occ.item.name`, subtitle = `t('upcoming.next', { date: formatDate(parseDayStart(occ.dueOn), { day:'numeric', month:'short' }) })`, amount `PriceText` from `occ.item.defaultAmount`.
- Row `onPress` still opens `categoryItemFormHref({ categoryId: occ.item.categoryId, editId: occ.item.id, bridgeId })` — keep it editable (add a `bridgeId` + subscribe/refetch so archiving from the form updates the forecast, mirroring the items modal).
- **Remove the overdue badge** and `upcoming.overdue` key: with calendar roll-forward, `dueOn` is always ≥ today, so "overdue" no longer applies.

## 5. Delete the fixtures

- Delete `data/__fixtures__/category-items.ts` (nothing should import it after steps 3–4; grep to confirm — the transaction form still uses real `rankDescriptionsByUsage`, not fixtures).
- Keep `components/upcoming/tones.ts` (real, shared).

## Constraints & acceptance

- Upcoming card + modal are computed from real `category_items` via `buildUpcoming`; creating a monthly item with a due date in the next 30 days makes it appear; archiving it (via the item form the row opens) removes it.
- `buildUpcoming`/`nextOccurrenceOnOrAfter` are pure and covered by `data/__tests__/upcoming.test.ts`; the suite passes.
- `data/__fixtures__/category-items.ts` is deleted and no file imports it.
- Repo typecheck passes; ESLint clean; existing tests + the new ones green; no console errors.
