# Component 2 — Overview

The Overview is the primary financial summary card on the dashboard. It reflects the active time-filter scope (month or year) and exposes a per-lens view of expenses, revenue, and net.

All labels are sourced from i18next; all monetary, numeric, and date values are formatted via the active language and the user-selected currency. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Monthly overview display

```
Given that the user is logged in
And a specific year and a specific month are selected in the time filter
And the full-year chip is not selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected month as the primary metric
And the primaryLabel must read "<month name> <year>" with the month name produced by Intl.DateTimeFormat in the active language
  (e.g. pt-BR: "Maio 2026", en: "May 2026")
And it must display the previous month's total expenses as the baseline comparison
And the previous-month comparison must cross the year boundary when the selected month is January
  (e.g. January 2026 compares against December 2025)
And the comparison row must include a directional indicator (arrow + percentage) and the previous-period absolute value
And a mode badge from key "overview.modes.month" must be visible in the card header
  (en: "MONTH" / pt-BR: "MÊS")
And all monetary values must be formatted via Intl.NumberFormat using the active language as the locale and the user-selected currency
  (e.g. pt-BR + BRL: "R$ 1.234,56"; en + USD: "$1,234.56"; en + EUR: "€1,234.56"; pt-BR + USD: "US$ 1.234,56")
```

### Year overview display

```
Given that a specific year is selected in the time filter
And the full-year chip is selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected year as the primary metric
And it must display the previous year's total expenses as the baseline comparison
And it must display a horizontal timeline below the comparison
And the timeline header must come from key "overview.allMonths"
  (en: "ALL MONTHS" / pt-BR: "TODOS OS MESES")
And the timeline must list one entry per month with that month's total
And each timeline entry's month label must come from Intl.DateTimeFormat with style "short" in the active language
And the current month must be visually highlighted in the timeline (only when the selected year is the current year)
And a mode badge from key "overview.modes.year" must be visible in the card header
  (en: "YEAR" / pt-BR: "ANO")
```

### Comparison row format

```
Given that an overview comparison is rendered (month or year mode)
When the comparison row is displayed
Then it must contain a directional indicator, a signed percentage, and a baseline phrase
And the baseline phrase must be built from the i18next key "overview.vsPrevious" with the placeholders {{label}} and {{value}}
  - {{label}} is the comparison period label (month name in the active language, or year as a 4-digit string)
  - {{value}} is the previous-period absolute amount formatted as a plain number in the active language
  (e.g. en: "vs April: 4,700.00"; pt-BR: "vs Abril: 4.700,00"; year mode: "vs 2025: 50.000,00")
And the absolute delta amount must be hidden — only the percentage is shown next to the indicator
And the indicator's icon and tone must reflect the movement:
  - delta > 0 → up-right arrow, tone reflects the lens-specific favorability (red/green per "Per-lens comparison semantics")
  - delta < 0 → down-right arrow, tone reflects the lens-specific favorability
  - delta = 0 → minus icon, neutral muted tone (textMuted); percentage renders as "0%" with no sign
And signed percentages use "exceptZero" sign display (positives prefixed with "+", negatives with "−", zero rendered bare)
And the percentage's decimal separator must follow the active language (comma in pt-BR, dot in en)
```

### Per-lens comparison semantics

```
Given that the comparison row is rendered
When the active lens is "expenses" (label from key "overview.expenses")
Then the comparison must compare current expenses to previous-period expenses
And a higher value must be tinted red (lower spending is the favorable outcome)

When the active lens is "revenue" (label from key "overview.revenue")
Then the comparison must compare current revenue to previous-period revenue
And a higher value must be tinted green (higher revenue is the favorable outcome)

When the active lens is "net" (label from key "overview.balance")
Then the comparison must compare current net (revenue minus expenses) to previous-period net
And a higher value must be tinted green (higher net is the favorable outcome)

When revenue visibility is disabled, the comparison must always use the "expenses" semantics.
```

### Revenue visibility off (default)

```
Given that the "Show revenue" toggle is off
When the overview is rendered
Then only expense totals must be visible
And no segmented control or revenue/expense/net rows must be shown
And the comparison row must always use expense semantics
```

### Revenue visibility on

```
Given that the "Show revenue" toggle is on
When the overview is rendered
Then a segmented control must be visible with three options, all sourced from i18next:
  - value "expenses" → label from key "overview.expenses" (en: "Expenses" / pt-BR: "Despesas")
  - value "revenue"  → label from key "overview.revenue"  (en: "Revenue"  / pt-BR: "Receitas")
  - value "net"      → label from key "overview.balance"  (en: "Balance"  / pt-BR: "Saldo")
And three labeled metric rows must be displayed below it: Revenue, Expenses, Balance (same i18next keys)
  (Balance = Revenue − Expenses, rendered with strong emphasis)
And switching the segmented control must update both the primary value at the top of the card and the comparison row in real time
And the toggle state must be persisted to local storage so it is restored on next launch
```

### Market-style financial presentation

```
Given that the overview component is rendered in any mode
When monetary values are displayed
Then they must use the PriceText component with appropriate scale (xl for primary, smaller for secondary)
And PriceText must receive the active language as its `locale` prop so the number-formatting separators follow the active language
And the currency code passed in must be the user-selected currency from useCurrency
And changes must always use the directional arrow + percentage pattern (no raw deltas in the foreground)
And tone usage must remain subtle: green/red for outcome, never as decorative emphasis
And the layout must resemble a financial market summary card (label, large value, small comparison line) rather than a budgeting tool
```

### Context-aware comparison logic

```
Given that the overview is rendered
When the comparison delta is computed
Then the previous period must match the same aggregation level as the primary period:
  - month mode → previous month (crossing year boundaries when the selected month is January)
  - year mode → previous year
And the percentage must be the delta divided by the previous-period absolute value
And when the delta is zero (current equals previous), the percentage must be "0%" and rendered with the neutral muted tone
And when the previous-period value is zero AND the current value is non-zero, the percentage must be omitted (only the absolute baseline is shown)
```

### Revenue toggle source of truth

```
Given that the "Show revenue" toggle exists
When the user wants to flip it
Then the control lives on the Settings tab inside the Display section (not on the Balance screen itself)
And toggling it in Settings must take effect on the Overview without an app restart
  (cross-instance state sync via the persisted-state hook)
And the persisted storage key for this toggle is "dashboard:revenue-visible"
```

### Localization

```
Given that the active language is one of the supported languages
When any overview content is rendered
Then every label must be sourced from i18next using these keys:
  - segmented control:  "overview.expenses" / "overview.revenue" / "overview.balance"
  - metric rows:        "overview.revenue" / "overview.expenses" / "overview.balance"
  - mode badges:        "overview.modes.month" / "overview.modes.year" / "overview.modes.all"
  - timeline header:    "overview.allMonths"
  - comparison phrase:  "overview.vsPrevious" with {{label}} + {{value}}
And every monetary value must be formatted via Intl.NumberFormat using the active language as the locale and the user-selected currency
And percentages must use the active language's decimal separator (en: ".", pt-BR: ",")
And month names in the primaryLabel, comparisonLabel, and timeline labels must be produced by Intl.DateTimeFormat in the active language

Given that the user changes the active language or currency from Settings
When the Overview re-renders
Then every label and number must update in place without an app restart
```

See the [Localization spec](localization.md) for the broader language/currency contract.
