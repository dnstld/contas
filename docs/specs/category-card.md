# Component 4 — Category Card

A single tile inside the Category Grid. Display-only — not interactive in the current scope. Designed to be readable in a 2-column layout on phone widths.

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
  - the text "vs <previous period label>: <previous absolute>"
  (e.g. "↑ +32% vs Abril: 4.700,00" or "↑ +32% vs 2025: 50.000,00")
And the previous absolute must be rendered as a plain number with the pt-BR thousand/decimal separators (no currency symbol)
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
Then it must read "<n> transação" for n=1 and "<n> transações" for n≥2
And the caption must use the muted secondary tone
And it must sit below the comparison row
```

### Empty card state

```
Given that the category has zero activity in the period
When the card is rendered
Then the comparison row and transaction count must be omitted
And a single line "Sem atividade neste período" must replace them
And the header (name + share %) and total (R$ 0,00) must remain visible
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
Given that the app is configured for Brazilian Portuguese
When the card is rendered
Then all labels must be in Portuguese:
  - share %: "12%"
  - comparison: "vs <month name in pt-BR>" in month mode, "vs <year>" in year mode
  - transaction count: "1 transação" / "<n> transações"
  - empty state: "Sem atividade neste período"
And monetary totals must use the pt-BR locale (R$ X.XXX,XX)
And percentages must always render as whole numbers (no decimals)
```
