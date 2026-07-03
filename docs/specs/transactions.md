# Component 10 — Transactions Screen

The Transactions tab is the dashboard's chronological view of completed transactions for the selected period. It shares the Balance screen's time filter so a single filter selection drives both surfaces, and surfaces a period total card (spent + incoming, side by side) above a day-grouped section list.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Screen layout and order

```
Given that the user is logged in
And they navigate to the Transactions tab
When the screen is rendered
Then the layout must follow this vertical order:
  1. The shared time filter (FinanceTimeFilter) — pinned above the scrolling content
  2. A SectionList of completed transactions, grouped by calendar day, whose
     ListHeaderComponent renders the bordered "total" card for the period
And the total card therefore scrolls with the list (it is not a static element above the list);
  only the time filter remains pinned at the top
And the content must sit below the transparent global header (paddingTop = useHeaderHeight())
  so no element is occluded by the header chrome
And the spacing between the time filter and the total card must be 16 points
  to match the section spacing used on the Balance screen
```

### Shared time filter

```
Given that the Transactions screen is rendered
When the filter at the top is displayed
Then it must use the FinanceTimeFilter component (the same shared wrapper as the Balance screen)
And the filter state must come from the useFinanceTimeFilter hook backed by storage key "dashboard:time-filter:v2"
  (this is the same key the Balance screen uses, so the two tabs always reflect the same selection)
And changing the filter on the Transactions tab must update the Balance tab's filter on next render, and vice versa
  (state syncs live across consumers via the in-memory cell in usePersistedState; no app restart needed)
And the filter must offer the same chips, in the same order, and with the same behavior as on Balance
  (see the [Time Filter Bar spec](time-filter-bar.md))
And the visible years range must be 2 (current year + previous year), matching Balance
```

### Period total card

```
Given that the Transactions screen has completed loading
When the total card is rendered
Then it must render inside the SectionList's ListHeaderComponent so it scrolls with the list
And a header row at the top of the card must show, left-to-right:
  - the period label (the selected month name in month mode, or the 4-digit year in year mode),
    uppercased, in the muted secondary tone
  - the transaction count from key "transactions.countShort" with {{count}} (uses plural rules),
    right-aligned, in the muted secondary tone
And below the header row it must show two equal-width "muted" Surface tiles, side by side:
  1. Spent tile — caption from key "transactions.spentMonth" in month mode / "transactions.spentYear"
     in year mode; a PriceText (size "lg") of the period's total expenses, rendered in the neutral tone
  2. Incoming tile — caption from key "transactions.incoming"; a PriceText (size "lg") of the period's
     total income, rendered in the positive (green) tone
And both totals count only completed transactions for the filtered period (scheduled entries are excluded)
And both values must be formatted via Intl.NumberFormat using the active language as the locale
  and the user-selected currency (see [Localization spec](localization.md))
And there is no separate "net" number on this card
```

### Scroll reset on filter change

```
Given that the Transactions screen has been scrolled down
When the user changes the time filter (year, month, or full-year chip)
Then the SectionList must animate back to the top of the page
So the user always sees the total card after a filter change,
  instead of being stranded mid-list.
```

### Filter resolution rules

```
Given that the time filter is applied to the transaction list
When the filtered set is computed
Then year is taken from filter.years[0] (always defined by the filter contract)
And when filter.all === true the entire selected year is included
And when filter.all === false the single selected month (filter.months[0]) is included
And only transactions with status === "completed" and a non-empty `date` field are considered
  (scheduled entries are filtered out entirely)
And the same rules drive both the section list and the net total
```

### Day-grouped section list

```
Given that the filtered transaction set is non-empty
When the section list is rendered
Then transactions must be sorted by `date` descending (newest first)
And consecutive transactions sharing the same calendar day (local timezone) must be grouped into a single section
And each section header must render an uppercased caption that follows these rules:
  - same calendar day as `now` → label from key "transactions.today"
    (en: "Today" / pt-BR: "Hoje")
  - exactly the day before `now` → label from key "transactions.yesterday"
    (en: "Yesterday" / pt-BR: "Ontem")
  - same year as `now` (but not today or yesterday) → Intl.DateTimeFormat({ day: "numeric", month: "long" }) in the active language
    (e.g. en: "13 May" / pt-BR: "13 de maio")
  - different year from `now` → Intl.DateTimeFormat({ day: "numeric", month: "long", year: "numeric" }) in the active language
    (e.g. en: "12 May 2025" / pt-BR: "12 de maio de 2025")
And this relative-date logic must come from the shared `makeSectionLabeler` labeler built on
  the day-grouping pipeline in data/transactions-list.ts (`buildTransactionsList` / `makeSectionLabeler`),
  which reuses the same relative-date rules as the Balance card's last-update label
  (see [Overview spec](overview.md), "Last-update label")
And section headers must NOT stick to the top of the list (stickySectionHeadersEnabled is false);
  they scroll away with their rows
And the same day-grouping rules apply in both month-mode and year-mode filter selections — there is no alternative grouping for the year view
And rows within a section must be separated by a 1-point horizontal divider (the design-system Divider atom)
And every section (day group) after the first must have an extra 16pt top margin on its header,
  so sections read as visually separate blocks (the first section keeps the default header spacing,
  since it already sits below the list's own header content)
And the list must use these virtualization defaults: initialNumToRender=20, windowSize=10, removeClippedSubviews on Android
And this grouping/rendering must be produced by the shared `SectionList` organism (components/ui/organisms/section-list.tsx, variant="flat") —
  the category detail modal's transaction list (opened by tapping a category card) reuses the same organism and the same
  `buildTransactionsList`/`makeSectionLabeler` data pipeline, so both surfaces render day groups identically
```

### Transaction row layout

```
Given that a transaction row is rendered inside the section list
When the row is displayed
Then the row is the shared SectionListRow molecule (size "sm", density "compact") laid out left-to-right:
  1. A leading circular Avatar. It shows the row creator's avatar image when one exists,
     otherwise initials derived from the creator's display name (falling back to the category name)
  2. A flex middle column with:
     - the category name on top (title)
     - a creator label under it (text1) — the string from key "transactions.createdByYou" when the
       current user created the row, otherwise the creator's first name; omitted when the creator is unknown
     - the transaction description below (subtitle), omitted when the description is empty
  3. A right-aligned PriceText (text2):
     - value = the transaction amount, with the auto sign display
     - size = "md"
     - tone = "positive" (green) for income, "neutral" for expense
     - currency = the user-selected currency; locale = the active language
And the leading Avatar is omitted entirely when the row has no known creator (e.g. read-only example data)
```

### Row press behavior

```
Given that a transaction row is rendered
When the user taps anywhere on the row
Then the app must push the /edit modal route with that row's transaction id as the `id` query parameter
  (router.push({ pathname: "/edit", params: { id: <row.id> } }))
And the press must show a brief visual feedback (opacity 0.6 while pressed)
And the row must be the entire press target — there is no secondary action button on the row
And no other affordance (ellipsis menu, swipe action, long-press) is wired in the current scope
(Creating a new transaction lives on the global header's "Adicionar" button and pushes /create — see [Create Modal spec](create-modal.md).
 Editing and deleting a specific transaction are handled by the edit modal — see [Edit Modal spec](edit-modal.md).)
```

### Empty state

```
Given that the filter produces no completed transactions for the selected period
When the screen is rendered
Then the section list must not be mounted
And the total card must still render at the top of the scrollable area (it is not part of the section list in this state)
And below the total card the EmptyState molecule must be rendered, vertically centered in the remaining space
  (occupying the rest of the screen)
And the EmptyState icon must be "chart.bar.fill"
And the EmptyState title must come from key "transactions.empty.title"
  (en: "Nothing here" / pt-BR: "Nada por aqui")
And the EmptyState body must come from key "transactions.empty.body"
  (en: "Nothing logged in this period." / pt-BR: "Nada registrado neste período.")
And the filter and total card must still be visible above the empty state
  (so the user can change the filter without leaving the screen)
```

### Loading, error, and stale states

```
Given that the Transactions screen derives its render state from the finance query via toQueryView
When the query is still pending (no cached data yet)
Then the screen must render the TransactionListSkeleton in place of the list

When the query has errored and there is no cached data to fall back on
Then the screen must render the ErrorEmptyState (message keyed from the mapped error) with a retry action

When the query has cached data but a background refetch failed (stale)
Then the screen must render the StaleDataBanner (with a retry action) above the list/total card,
  while still showing the last good data below it

And in every ready/empty/stale state the time filter remains pinned at the top so the user can
  re-scope without leaving the screen
```

### Data source coupling

```
Given that the Transactions screen is mounted
When transaction data is read
Then it must come from the useFinance hook (the same hook the Balance screen uses),
  which returns a Finance-shaped result from one of two sources depending on the demo toggle:
  - when Demo mode is enabled → the seeded generator output (generateDemoFinance(currency))
  - when Demo mode is disabled → the live DB-backed result assembled from the useCategories and
    useTransactions queries (scoped to the current walletId — see
    [Authentication spec](authentication.md) → "Wallet provisioning after sign-in"), adapted into the
    Finance shape (amount_cents / 100, denormalized categoryName/type from the joined category,
    derived `years` from actual transaction dates)
And Demo mode is owned by the useDemoMode hook, persisted per-user under the kv-store key
  "settings:demo-mode:<userId>" (bucketed by the signed-in user id; disabled entirely when signed out)
And useFinance surfaces query status (isLoading / isError / isDemo / refetch) that the screen maps via
  toQueryView into loading / error / stale / empty / ready states (see "Loading, error, and stale states"),
  so the "Nothing here" copy never flashes before the fetch resolves
And toggling Demo mode in Settings must update the Transactions screen on next render
  without an app restart, consistent with the Balance screen's behavior:
  flipping demo on short-circuits the DB read and immediately renders the generator output;
  flipping demo off re-engages the DB queries (already mounted, keeping their cached data)
```

### Mock data realism — no future-dated entries

```
Given that the seeded mock is in use (Demo mode on)
When `generateDemoFinance` produces the transaction list
Then no transaction may carry a `date`/`startDate`/`nextOccurrence` that is after the current calendar day
  (i.e. months entirely in the future are skipped; the current month is clamped to days 1..today's day)
And the current month must only contain entries whose computed day is ≤ today's day
And the current month's salary date is clamped to min(5, today's day)
And freelance entries are only added when the current month has already reached day 10
And recurring/scheduled entries are only added when the current month has reached day 5
This guarantees that the visible "Today" / "Yesterday" sections reflect plausible recent activity
rather than being filled with synthetic future activity.
```

### Localization

```
Given that the active language is one of the supported languages
When the Transactions screen is rendered
Then every label must be sourced from i18next using these keys:
  - total card spent caption:   "transactions.spentMonth" / "transactions.spentYear"
  - total card incoming caption: "transactions.incoming"
  - total card count:           "transactions.countShort" with {{count}} (uses plural rules)
  - row creator label:          "transactions.createdByYou" (when the current user is the creator)
  - section headers:            "transactions.today" / "transactions.yesterday"
                                (other day labels come from Intl.DateTimeFormat in the active language)
  - empty state:                "transactions.empty.title" / "transactions.empty.body"
And every monetary value must be formatted via Intl.NumberFormat using the active language as the locale
  and the user-selected currency
And the day/month names inside section headers must come from Intl.DateTimeFormat in the active language —
  no hardcoded month-name array is consulted
And when the user changes the active language or currency in Settings, every label and amount must update in place
  without an app restart
```

See the [Localization spec](localization.md) for the broader language/currency contract.
