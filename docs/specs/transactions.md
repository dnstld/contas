# Component 10 — Transactions Screen

The Transactions tab is the dashboard's chronological view of completed transactions for the selected period. It shares the Balance screen's time filter so a single filter selection drives both surfaces, and surfaces a single high-level number (net) above a day-grouped section list.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Screen layout and order

```
Given that the user is logged in
And they navigate to the Transactions tab
When the screen is rendered
Then the layout must follow this vertical order:
  1. The shared time filter (FinanceTimeFilter)
  2. A bordered "total" card displaying the net total for the period
  3. A SectionList of completed transactions, grouped by calendar day
And the content must sit below the transparent global header (paddingTop = useHeaderHeight())
  so no element is occluded by the header chrome
And the spacing between the filter, the total card, and the section list must be 32 points
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

### Net total card

```
Given that the Transactions screen has completed loading
When the total card is rendered
Then it must display a caption label sourced from key "transactions.net"
  (en: "NET" / pt-BR: "SALDO"), uppercased, with the muted secondary tone
And below the caption it must display a single large PriceText with size "xl"
And the displayed value must equal income − expenses for the filtered period
  (only completed transactions count; scheduled transactions are excluded)
And the value must be formatted via Intl.NumberFormat using the active language as the locale
  and the user-selected currency (see [Localization spec](localization.md))
And no income / expense breakdown rows must be rendered under the total
And no positive/negative color tinting must be applied to the value — it always renders in the neutral text color
  (negatives are conveyed by the auto sign display, e.g. "−R$ 50,00")
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
And section headers must stick to the top of the list as the user scrolls (stickySectionHeadersEnabled)
And the sticky header must paint over scrolling rows using the theme background color so rows do not bleed through
And the same day-grouping rules apply in both month-mode and year-mode filter selections — there is no alternative grouping for the year view
And rows within a section must be separated by a 1-point horizontal divider (the design-system Divider atom)
And the list must use these virtualization defaults: initialNumToRender=20, windowSize=10, removeClippedSubviews on Android
```

### Transaction row layout

```
Given that a transaction row is rendered inside the section list
When the row is displayed
Then the row must contain, left-to-right:
  1. A circular 36×36 "muted" Surface avatar containing a 2-letter category badge
     (the first two letters of the category name, uppercased, after stripping non-letter/non-digit characters
      via /[^\p{L}\p{N}]/gu — e.g. "Bar / Restaurante" → "BA", "Alimentação" → "AL", "Mercado" → "ME")
  2. A flex middle column with:
     - the category name on top (body variant, semibold weight, single line with ellipsis)
     - the transaction description below (caption variant, muted tone, single line with ellipsis)
  3. A right-aligned PriceText:
     - value = +amount for income, −amount for expense
     - size = "md"
     - tone = "neutral" (no green/red tinting — direction is conveyed only by the leading "+" or "−" via showSign)
     - currency = the user-selected currency; locale = the active language
And the row must be vertically padded by 10 points (top and bottom) so the divider rhythm matches the rest of the design system
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
And in its place the EmptyState molecule must be rendered, vertically centered in the remaining space
  (below the total card, occupying the rest of the screen)
And the EmptyState icon must be "chart.bar.fill"
And the EmptyState title must come from key "transactions.empty.title"
  (en: "No transactions" / pt-BR: "Sem transações")
And the EmptyState body must come from key "transactions.empty.body"
  (en: "No transactions match the selected period." / pt-BR: "Nenhuma transação no período selecionado.")
And the filter and total card must still be visible above the empty state
  (so the user can change the filter without leaving the screen)
```

### Demo mode coupling

```
Given that the Transactions screen is mounted
When transaction data is read
Then it must come from the useFinanceMock hook (the same hook the Balance screen uses)
And when "settings:demo-mode" is true the seeded generator output is used (generateFinanceMock)
And when "settings:demo-mode" is false the starter (empty-transactions) mock is used
And toggling Demo mode in Settings must update the Transactions screen on next render
  without an app restart, consistent with the Balance screen's behavior
```

### Mock data realism — no future-dated entries

```
Given that the seeded mock is in use (Demo mode on)
When `generateFinanceMock` produces the transaction list
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
  - total caption:        "transactions.net"
  - section headers:      "transactions.today" / "transactions.yesterday"
                          (other day labels come from Intl.DateTimeFormat in the active language)
  - empty state:          "transactions.empty.title" / "transactions.empty.body"
And every monetary value must be formatted via Intl.NumberFormat using the active language as the locale
  and the user-selected currency
And the day/month names inside section headers must come from Intl.DateTimeFormat in the active language —
  no hardcoded month-name array is consulted
And when the user changes the active language or currency in Settings, every label and amount must update in place
  without an app restart
```

See the [Localization spec](localization.md) for the broader language/currency contract.
