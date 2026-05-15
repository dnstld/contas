# Component 4 — Category Card

A single tile inside the Category Grid. Display-only — not interactive in the current scope. Designed to be readable in a 2-column layout on phone widths.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Visual hierarchy

```
Given that a category card is rendered
When the user views the card
Then the layout follows this vertical order:
  1. Header row: category name (left, bold body) and share % (right, caption muted)
  2. Total amount (large price)
  3. Comparison row (arrow + percentage + previous-period reference)
  4. Transaction count caption
And the category name uses primary text emphasis
And the total uses the largest visual weight on the card
And all secondary information (share %, comparison, count) uses caption-sized muted text
```

### Total and budget-aware tone

```
Given that the card displays the category total
When a monthly budget is defined and the active period is month mode
Then the total's color is green when the spend is at or below budget
And red when the spend exceeds budget
And neutral otherwise (no budget defined, or year mode)
And budget influence is limited to the total's color — no progress meter or budget number is rendered on the card
```

### Comparison row

```
Given that the card has previous-period data
When the comparison row renders
Then it must include, in order:
  - a directional indicator (arrow or minus)
  - a signed percentage with no decimals
  - a phrase built from the i18next key "category.vsPrevious" with the placeholders {{label}} + {{value}}
    (en: "vs April: 4,700.00" / pt-BR: "vs Abril: 4.700,00")
And {{label}} in month mode must be the previous month's name produced by Intl.DateTimeFormat in the active language
And {{label}} in year mode must be the previous year as a 4-digit string
And {{value}} must be formatted via Intl.NumberFormat (plain number, no currency symbol) using the active language as the locale
And the indicator's icon and tone must reflect the movement:
  - delta > 0 → up-right arrow, red tone (more spending is unfavorable)
  - delta < 0 → down-right arrow, green tone (less spending is favorable)
  - delta = 0 → minus icon, neutral muted tone (textMuted); percentage renders as "0%" with no sign
And signed percentages use "exceptZero" sign display (positives prefixed with "+", negatives with "−", zero rendered bare)
  (lowerIsBetter applies to expense categories — the only kind shown in the grid)
```

### Transaction count

```
Given that the category has at least one completed transaction in the period
When the count caption is rendered
Then it must come from the i18next key "category.transactionCount" with the {{count}} placeholder
And i18next must apply the active language's plural rule:
  - en: "1 transaction" (count=1) / "<n> transactions" (count≠1)
  - pt-BR: "1 transação" (count=1) / "<n> transações" (count≠1)
And the caption must use the muted secondary tone
And it must sit below the comparison row
```

### Empty card state

```
Given that the category has zero activity in the period
When the card is rendered
Then the comparison row and transaction count must be omitted
And the empty line must come from the i18next key "category.noActivity"
  (en: "No activity in this period" / pt-BR: "Sem atividade neste período")
And the header (name + share %) and total (formatted in the active currency, e.g. "R$ 0,00" / "$0.00" / "€0.00") must remain visible
And the card must preserve the same overall structure to keep the grid visually balanced
```

### Layout robustness

```
Given that the category name or comparison row is wider than the card
When the card is rendered in a 2-column layout
Then the name must truncate to a single line with an ellipsis
And the comparison row must fit without forcing the card to grow disproportionately
And no element must be clipped beyond its containing card
```

### Non-interactive

```
Given that a category card is rendered
When the user taps it
Then nothing must happen
And no drill-down navigation, route change, or contextual filter must be triggered
(The card is intentionally display-only in the current scope.)
```

### Localization

```
Given that the active language is one of the supported languages
When the card is rendered
Then every label must be sourced from i18next using these keys:
  - comparison phrase:  "category.vsPrevious" with {{label}} + {{value}}
  - transaction count:  "category.transactionCount" with {{count}} (uses i18next plural rules per language)
  - empty state:        "category.noActivity"
And the previous-period {{label}} in month mode must be the previous month's name produced by Intl.DateTimeFormat in the active language
And {{value}} must be formatted via Intl.NumberFormat using the active language as the locale
And the total at the top of the card must be formatted as a currency using the active language and the user-selected currency
  (e.g. en + USD: "$1,234.56"; pt-BR + BRL: "R$ 1.234,56"; pt-BR + EUR: "€ 1.234,56")
And percentages must always render as whole numbers (no decimals), with the active language's sign / separator conventions
And the category name itself comes from stored data and is not translated
```

See the [Localization spec](localization.md) for the broader language/currency contract.
