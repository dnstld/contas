# Component 1 — Time Filter Bar

The time filter bar is the app's primary period-scoping control. It selects a year and either a specific month or the entire year (the "full year" chip). Every screen that reflects a finance period — currently the Balance dashboard and the [Transactions screen](transactions.md) — recomputes from this selection.

The filter UI lives in the `TimeFilterBar` organism and is consumed via the `FinanceTimeFilter` wrapper. Both surfaces share the same persisted selection (storage key `"dashboard:time-filter:v2"`) through the `useFinanceTimeFilter` hook, so a change on either tab is visible on the other.

Month labels and the full-year chip label follow the active language; see the [Localization spec](localization.md).

## Scenarios

### Initial dashboard load

```
Given that the user is logged in
And they access the dashboard for the first time
When the dashboard is rendered
Then the time filter bar must be visible in a single horizontal row
And it must contain, in order: year chips, a full-year chip, and month chips
And year chips must be rendered oldest-to-newest (e.g. 2025, 2026)
And month chips must start from the current month and descend in recency, wrapping the calendar
  (e.g. en: "May, April, March, …, June"; pt-BR: "Maio, Abril, Março, …, Junho")
And month-chip labels must be produced by Intl.DateTimeFormat with style "long" in the active language
And the full-year chip's label must come from key "timeFilter.fullYear"
  (en: "Full year" / pt-BR: "Ano todo")
And the year axis and the month axis must be independently selectable
And the current year must be selected by default
And the current month must be selected by default
```

### Default active filter state consistency

```
Given that the dashboard is loaded for the first time
When the time filter state is initialized
Then exactly one year must always be selected
And either a specific month OR "Ano todo" must always be selected
And the default year must be the current year
And the default month must be the current month
And "Ano todo" must not be selected by default
And no state must ever exist where neither a month nor "Ano todo" is selected
```

### Full-year chip behavior

```
Given that the time filter bar is visible
When the user selects the full-year chip (label from key "timeFilter.fullYear")
Then all specific-month selections must be cleared
And the currently selected year must remain selected
And the dashboard must switch to year-aggregation mode for the selected year
And the full-year chip must become the active month-axis selection
And a check icon must be displayed inside the full-year chip
And selecting any specific month chip must deactivate the full-year chip
```

### Selecting a month chip

```
Given that the time filter bar is visible
When the user selects a month chip
Then that month chip must become the primary visual variant
And a check icon must be displayed inside the selected month chip
And all other month chips must use the tertiary visual variant
And the full-year chip must be deactivated if it was active
And the dashboard must update to reflect the selected (year, month)
```

### Selecting a year chip

```
Given that the time filter bar is visible
When the user selects a year chip
Then that year chip must become the secondary visual variant
And all other year chips must use the default visual variant
And the active month-axis selection (specific month or full-year) must remain unchanged
And the dashboard must update to reflect the new year combined with the unchanged month-axis selection
```

### Independent selection behavior between year and month axes

```
Given that the time filter bar is visible
When the user selects a year and a month-axis value (specific month or full-year)
Then both selections must remain active independently
And changing the year must not change the month-axis selection
And changing the month-axis selection must not change the year selection
And the dashboard must compute data using both filters combined
```

### Preventing empty selection state

```
Given that the time filter bar is active
When the user taps the currently selected year chip
Then the selection must remain unchanged (a year is always required)

When the user taps the currently selected month chip while the full-year chip is inactive
Then the selection must remain unchanged (a month-axis value is always required)

When the user taps the full-year chip while it is already active
Then the selection must remain unchanged

In all states, exactly one year must be selected, and either a specific month OR the full-year chip must be selected.
```

### Persisting filter preferences

```
Given that the user has changed the year, month, or full-year selection
When the change is applied
Then the new state must be persisted to local storage immediately under the key "dashboard:time-filter:v2"

Given that the user leaves the app and returns
When the dashboard is mounted
Then the previously persisted year and month-axis selection must be restored
And if no persisted state exists, the current year and current month must be used as defaults
And the full-year chip must only be active on restore if it was the explicit last selection
And any persisted state with an invalid shape (missing year, both month and full-year missing) must be normalized back to defaults without error
```

### Cross-screen sharing

```
Given that more than one screen uses the time filter (currently Balance and Transactions)
When the user changes the selection on one screen
Then the other screen must reflect the same selection on its next render — no app restart required
And both screens must read the same persisted value from key "dashboard:time-filter:v2"
And both screens must obtain the filter API via the useFinanceTimeFilter hook so the storage key is never duplicated at the call site
And both screens must render the bar via the FinanceTimeFilter wrapper so the visible years range (2) and other UI defaults stay consistent
```

### Localization

```
Given that the active language is one of the supported languages
When the time filter bar is rendered
Then year chip labels are 4-digit numeric strings and do not change between languages
And the full-year chip label is sourced from i18next key "timeFilter.fullYear"
  (en: "Full year" / pt-BR: "Ano todo")
And each month-chip label is produced by Intl.DateTimeFormat with style "long" in the active language
  (e.g. en: "May" / pt-BR: "Maio")
And no hardcoded month-name array (pt-BR or en) is consulted anywhere in this component or its supporting hook
And when the user changes the active language from Settings, every chip label must update in place without an app restart
```

See the [Localization spec](localization.md) for the broader language/currency contract.
