# Component 1 — Time Filter Bar

The time filter bar is the dashboard's primary scoping control. It selects a year and either a specific month or the entire year ("Ano todo"). The dashboard recomputes from this selection.

## Scenarios

### Initial dashboard load

```
Given that the user is logged in
And they access the dashboard for the first time
When the dashboard is rendered
Then the time filter bar must be visible in a single horizontal row
And it must contain, in order: year chips, an "Ano todo" chip, and month chips
And year chips must be rendered oldest-to-newest (e.g. 2025, 2026)
And month chips must start from the current month and descend in recency, wrapping the calendar (e.g. Maio, Abril, Março, …, Junho)
And all chip labels must be in Brazilian Portuguese
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

### "Ano todo" chip behavior

```
Given that the time filter bar is visible
When the user selects the "Ano todo" chip
Then all specific-month selections must be cleared
And the currently selected year must remain selected
And the dashboard must switch to year-aggregation mode for the selected year
And "Ano todo" must become the active month-axis selection
And a check icon must be displayed inside the "Ano todo" chip
And selecting any specific month chip must deactivate "Ano todo"
```

### Selecting a month chip

```
Given that the time filter bar is visible
When the user selects a month chip
Then that month chip must become the primary visual variant
And a check icon must be displayed inside the selected month chip
And all other month chips must use the tertiary visual variant
And the "Ano todo" chip must be deactivated if it was active
And the dashboard must update to reflect the selected (year, month)
```

### Selecting a year chip

```
Given that the time filter bar is visible
When the user selects a year chip
Then that year chip must become the secondary visual variant
And all other year chips must use the default visual variant
And the active month-axis selection (specific month or "Ano todo") must remain unchanged
And the dashboard must update to reflect the new year combined with the unchanged month-axis selection
```

### Independent selection behavior between year and month axes

```
Given that the time filter bar is visible
When the user selects a year and a month-axis value (specific month or "Ano todo")
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

When the user taps the currently selected month chip while "Ano todo" is inactive
Then the selection must remain unchanged (a month-axis value is always required)

When the user taps the "Ano todo" chip while it is already active
Then the selection must remain unchanged

In all states, exactly one year must be selected, and either a specific month OR "Ano todo" must be selected.
```

### Persisting filter preferences

```
Given that the user has changed the year, month, or "Ano todo" selection
When the change is applied
Then the new state must be persisted to local storage immediately

Given that the user leaves the app and returns
When the dashboard is mounted
Then the previously persisted year and month-axis selection must be restored
And if no persisted state exists, the current year and current month must be used as defaults
And "Ano todo" must only be active on restore if it was the explicit last selection
And any persisted state with an invalid shape (missing year, both month and "Ano todo" missing) must be normalized back to defaults without error
```
