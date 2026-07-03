# Component 6 — Create Modal (Adicionar)

The "Adicionar" modal is the primary mutation entry point of the app. It is invoked from the global header's "+ Adicionar" button (see the [App Shell spec](app-shell.md)) and presented above whichever tab is currently active.

The route lives at `app/(modals)/create.tsx` (URL: `/create`). It renders the shared [`TransactionForm`](../../components/transactions/transaction-form.tsx) component with create-mode defaults. The same form component is reused by the [Edit Modal](edit-modal.md), so any change to the field set, layout, or interaction model applies to both surfaces.

Category selection and category create/edit are NOT inline in the form — they live in their own modal routes (`app/(modals)/category-select.tsx` and `app/(modals)/category-form.tsx`), coordinated with the form via an in-memory `categoryFormBridge`. The modal chrome (centered title + a close/xmark button) comes from the `app/(modals)/_layout.tsx` header, and the scrollable form + sticky footer come from the shared `ModalFormScaffold` template (built on react-native-keyboard-controller).

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Route exists and is reachable

```
Given that the user is anywhere in the app
When the user navigates to the route /create (programmatically or via the "Adicionar" button)
Then the create modal screen must mount and render
And no error must be thrown for missing routes or layouts
```

### Presentation style

```
Given that the user taps the global header "Adicionar" button on any tab
When the modal is presented
Then it must present with the modal transition from the root layout, where the "(modals)" group screen
  is registered with `presentation: 'modal'` (app/_layout.tsx)
And the underlying tab's screen must remain mounted in the stack underneath the modal
And the modal must not replace the underlying screen (it is presented on top, not navigated to)
And the modal must visually occupy the screen above the underlying content
And the transition must feel immediate and fluid
```

### Dismissal — back to the underlying tab

```
Given that the create modal is open
When the user dismisses the modal (via the in-screen close button, the swipe-down gesture, or the system back action)
Then the modal must be removed from the navigation stack
And the user must return to the tab they were on at the same scroll position and filter state as before
And the modal must not leave any residual UI on screen after dismissal
And the previously selected tab must be preserved
```

### Modal does not pollute deep links

```
Given that the user opens the app via a deep link or cold start
When no explicit /create link is in the deep-link path
Then the create modal must NOT be auto-presented
And it must only open as a direct response to a user action (Adicionar button tap or explicit programmatic push)
```

### Form structure and section order

```
Given that the create modal is visible
When the form is rendered
Then the modal header (from the (modals) group layout) shows the screen title from key "create.title"
  centered (en: "New Transaction" / pt-BR: "Nova transação") set via `Stack.Screen` options,
  and a close/xmark button on the header right that dismisses the modal
And the ModalFormScaffold body must display the following sections from top to bottom, in this exact order:
  1. Transaction type selector
  2. Amount input (currency code + large centered value)
  3. Date selector
  4. Category selector row (+ quick-pick chips)
  5. Description input
And the scaffold's sticky footer must contain the save action
And the footer must remain visible while the form scrolls (the action is never pushed off-screen)
```

### Modal mount — no auto-focus

```
Given that the user taps the "Adicionar" button
When the create modal mounts
Then the amount input must NOT auto-focus and the keyboard must NOT open automatically
  (the form no longer moves focus on mount — create and edit behave the same here)
And the numeric keyboard opens only when the user taps the amount input
```

### Default field values

```
Given that the create modal opens with no initial values
When the form is first rendered
Then transaction type must default to "expense"
And the amount must default to 0 (rendered using the user-selected currency, see "Amount formatting")
And the date must default to "now" (the current calendar instant in the device's timezone)
And the category must be unselected (no chip in active state)
And the description must be empty
```

### Transaction type selector

```
Given that the type selector is visible
When the form is rendered
Then it must use the design-system SegmentedControl with two options:
  - value "expense" → label from key "create.types.expense" (en: "Expense" / pt-BR: "Despesa")
  - value "income"  → label from key "create.types.income"  (en: "Income"  / pt-BR: "Receita")
And the currently selected option must display an active visual state
And the non-selected option must display an inactive visual state

When the user switches the type
Then the active/inactive states must update immediately
And the form's internal state must update on the same frame (no debounce)
And the previously selected category must be cleared, because available chips change with type
  (see "Category chips")
```

### Amount input — visual hierarchy

```
Given that the create modal is visible
When the amount input is rendered
Then it must be the primary visual element on the screen:
  - rendered as a large, bold, centered piece of typography (≈56-point font, 64-point line height, rounded font family)
  - given more vertical breathing room than any other field (≈24-point top and bottom padding)
And surrounding section labels (date, category, description) must use the muted caption style so the amount remains dominant
And when the amount is zero, the rendered string must use the muted text tone (it reads as a placeholder)
And once the amount becomes non-zero, the rendered string must switch to the primary text tone
```

### Amount input — number formatting

```
Given that the amount input is rendered or focused
When the user types numeric values
Then the wallet's currency CODE (e.g. "BRL") is shown as a small muted label above the amount,
  and the amount itself renders as a plain locale-formatted decimal number (NOT a full currency string
  with symbol): `formatDecimal(amountCents / 100)` — grouping and decimal separators follow the active language
And the input keyboard must be numeric-only (number-pad on iOS / inputMode="numeric" on Android)
And input handling is calculator-style on the cents integer: each new digit shifts cents left and each
  deletion divides by ten, regardless of cursor position, so typing 1,2,3,4 walks
  "0,00" → "0,01" → "0,12" → "1,23" → "12,34" (pt-BR)
And the displayed value must always be a valid decimal for the active locale (no unfinished separators visible)
And changing the user's language or the wallet's currency in Settings must reformat the visible amount and the
  currency-code label instantly without losing the underlying cents value
```

### Date selector — current date by default and always visible

```
Given that the create modal opens
When the date selector is rendered
Then the selected date must default to the current calendar date
And the selected date must always be visible on screen (the picker is inline, not behind a button)
And the picker must use the design-system DatePicker atom
  (SwiftUI.DatePicker on iOS / Compose.DateTimePicker variant="input" on Android)
And changing the date must update the form state immediately

Given that the user is editing the date
When they pick a new date
Then the picker UI must reflect the new selection without dismissing the form
And the rest of the form must remain visible and interactive
```

### Category selector row + quick-pick chips

```
Given that the create modal is visible
When the category section is rendered
Then it must show a CategorySelect row with:
  - a title from key "category.section.expenses" for expense type / "category.section.income" for income type
  - the currently selected category's name, or the placeholder from key "categorySelect.placeholder" when none
  - tapping the row opens the category-select route
And below the row, a chip row shows up to 5 categories of the current type, followed by an "All categories"
  accent chip (key "categorySelect.groups.all") that also opens the category-select route:
  - when the wallet has usage data for this type, the 5 are the most-used categories
    (ranked by `rankCategoriesByUsage` — the same ranking the picker's "Most used" group uses, so both
    surfaces agree)
  - when there is no usage data yet for this type (a fresh wallet, or this type just hasn't been used),
    the 5 fall back to the first categories of that type alphabetically, so the row is still useful
And the chip row is omitted only when there are zero categories of the current type at all
And the chip row wraps onto multiple lines as needed (an inline block layout) — it never scrolls horizontally

When the user taps a quick-pick chip
Then that category becomes the selected category (single selection; selecting another chip replaces it)

When the user switches the transaction type
Then the selection is cleared (available categories change with type) and the chip row re-ranks for the new type
```

### Category picker route (category-select)

```
Given that the user opens the category-select route (with params: type, bridgeId, optional selectedId)
When the picker is rendered in list mode
Then it shows a search field (placeholder "categorySelect.searchPlaceholder") and a flat SectionList:
  - while not searching: a "Most used" group (key "categorySelect.groups.mostUsed") and an
    "All categories" group (key "categorySelect.groups.all"), both in usage order
  - while searching: a single alphabetically-sorted results group
  - when the wallet has no categories of this type: a "Suggestions" group
    (key "categorySelect.suggestions.section") of starter names for that type
And when the typed term doesn't exactly match an existing category of this type, an inline
  "Create <term>" row (key "categorySelect.createNamed" with {{name}}) appears above the list
And tapping a category row emits `selected` on the categoryFormBridge and dismisses the picker
  (the form adopts that categoryId)

When the user taps a suggestion, the "Create <term>" row, opening create from the picker
Then the picker switches to an in-sheet create view: the modal header title becomes "category.create.title"
  with a back chevron (returns to list mode), the body renders the shared CategoryFields
  (a Name input + an optional Monthly-goal currency input), and the sticky footer shows a
  "categorySelect.createAndSelect" primary button (disabled while the name is empty, a mutation is in
  flight, or Demo mode is on)
And on success the mutation INSERTs the category, invalidates the categories query, emits `created` on the
  bridge (so the form auto-selects the new category), and dismisses the picker
```

### Creating and editing categories (category-form route)

```
Given that a category is created or edited outside the picker
When the category-form route is opened
Then in create mode it renders CategoryFields (Name + optional Monthly goal); when the wallet has no
  categories of this type yet it also offers starter-name suggestion chips, and (when no type param is
  passed) a type SegmentedControl; the primary action is "category.create.createButton"
And in edit mode (params include editId) it pre-fills the category's name + monthly goal, focuses nothing,
  and shows a "category.edit.saveButton" primary action plus a destructive "category.edit.delete" action
  side by side; Save is enabled only when something changed (name or budget) and not in Demo mode
And deleting prompts a confirm Alert ("category.edit.deleteConfirm*"); if the category still has
  transactions the delete is rejected and an inline warning renders from key "category.edit.hasTransactions"
  with {{count}} (uses plural rules)
And create success emits `created` on the bridge; delete success emits `deleted` (the form deselects the
  category if it was selected) — both via categoryFormBridge, then the route dismisses
And note: the transaction form itself no longer long-presses chips to edit; category editing is reached from
  the category grid / category detail (see [Category Card spec](category-card.md))
```

### Description input — free text with a 100-character cap

```
Given that the create modal is visible
When the description input is rendered
Then the field must accept free text input
And the field must render as a rounded filled box using the surfaceMuted background colour
  (same visual treatment as the inputs in the CreateCategoryModal)
And the placeholder must come from key "create.descriptionPlaceholder"
  (en: "ex: Airfare" / pt-BR: "ex: Passagem aérea")
And the field's maxLength must be 100 characters (the native input enforces the hard cap)
And the field is optional — leaving it empty must not block submission
And the caption below the field must read the value of key "create.descriptionCaption"
  (en: "Appears in transactions" / pt-BR: "Aparece nas transações")
And a live character counter must render on the same row as the caption, right-aligned
And the counter must be sourced from key "create.descriptionCounter" with the interpolation {{count}}
  (e.g. "0/100" → "12/100" → "100/100" as the user types)
And the counter must update on every keystroke
And the user must not be able to enter a 101st character (the platform-native maxLength prevents it)
```

### Save action — visual treatment

```
Given that the create modal is visible
When the save action is rendered
Then it must render as the shared design-system PressableButton with variant="primary" and size="large",
  full-width in the ModalFormScaffold sticky footer (create has no delete action, so the footer holds only save)
And its label must come from key "create.save" (en: "Save" / pt-BR: "Salvar")
And it must follow the Liquid Glass primary-button treatment (glassProminent on iOS 26+, Material tonal on
  Android — see [Design System spec](design-system-liquid-glass.md)), tinted with the theme's primary tint
And while the mutation is in flight it must show its loading state
```

### Save action — enablement

```
Given that the save action is rendered
When the form state changes
Then the save action must be enabled if and only if:
  - amountCents > 0, AND
  - a category is selected, AND
  - no create/delete mutation is in flight
And while disabled, the PressableButton renders in its disabled state and taps must not dispatch the submit handler
And the type selector, date, and description never block enablement on their own
  (type defaults to "expense", date defaults to "now", description is optional)
```

### Saving a transaction

```
Given that the form is in a valid state (see "Save action — enablement")
When the user taps the save action
Then the form's onSubmit handler is invoked with the current values:
  { type, amountCents, date, categoryId, description }
And before persisting, create.tsx runs `findDuplicateTransactions` (same date + amount + category) against the
  cached transactions; if any match, a DuplicateWarningModal appears (key "create.duplicateWarning.*") offering
  "Save anyway" / "Cancel" — only on confirm (or when there is no match) does it persist
And persisting calls useCreateTransaction, which INSERTs the transaction and invalidates the transactions query
  (and auto-enables the wallet's show_revenue on its first income transaction, per the Data Model spec)
And on success it shows a success toast (key "feedback.transactionCreated") and dismisses the modal (router.back)
And on failure it sets an inline error message above the footer: "edit.demoReadOnly" when Demo mode is read-only,
  otherwise the localized key from `mapSupabaseErrorKey(error)` — the modal stays open
```

### Layout under the keyboard

```
Given that the keyboard is visible (because the amount or description input is focused)
When the form layout settles
Then the form fields must remain laid out at their natural size — fields must not visibly compress or overlap each other
And the form-fields region must remain scrollable independently of the footer
And the footer (save action) must stay anchored above the keyboard via the ModalFormScaffold's sticky footer
  (react-native-keyboard-controller — never a KeyboardAvoidingView; see the project's modal keyboard scaffold)
```

### Fixed footer vs scrollable form

```
Given that the create modal is rendered
When the layout is computed
Then the modal must be structured as: the (modals) group native header (centered title + close) →
  ModalFormScaffold, which owns a scrollable form-fields region plus a sticky footer holding the action row
And the scaffold keeps the footer above the keyboard and lets the fields scroll within the remaining space,
  so scrolling reliably engages whenever the form fields exceed the available area
```

### Localization

```
Given that the active language is one of the supported languages
When the create modal is rendered
Then every user-facing string must be sourced from i18next using these keys:
  - modal title:              "create.title"
  - modal close button:       "common.close" (accessibility label on the header xmark)
  - type options:             "create.types.expense" / "create.types.income"
  - amount accessibility:     "create.amountPlaceholder"
  - date section label:       "create.dateLabel"
  - category section title:   "category.section.expenses" / "category.section.income"
  - category placeholder:     "categorySelect.placeholder"
  - "all categories" chip:    "categorySelect.groups.all"
  - picker title / groups:    "categorySelect.title" / "categorySelect.groups.mostUsed" / "categorySelect.groups.all"
  - picker search / create:   "categorySelect.searchPlaceholder" / "categorySelect.createNamed" ({{name}}) /
                              "categorySelect.createAndSelect" / "categorySelect.suggestions.section"
  - create-category actions:  "category.create.title" / "category.create.createButton" / "category.create.creating"
  - edit-category actions:    "category.edit.title" / "category.edit.saveButton" / "category.edit.delete" /
                              "category.edit.deleteConfirm*" / "category.edit.hasTransactions" ({{count}})
  - description label/placeholder/caption/counter: "create.descriptionLabel" / "create.descriptionPlaceholder" /
                              "create.descriptionCaption" / "create.descriptionCounter" ({{count}})
  - save action label:        "create.save"
  - duplicate warning:        "create.duplicateWarning.*"
  - success toast:            "feedback.transactionCreated"
And the amount renders as a locale-formatted decimal with the wallet currency shown as a separate code label
And changing the active language or the wallet's currency in Settings must reformat the amount and update every
  label in place, without an app restart and without losing in-progress field state
```

### Reusable form contract

```
Given that the form is implemented in components/transactions/transaction-form.tsx
When other entry points need the same form
Then the same component must be reused (the Edit Modal does — see [Edit Modal spec](edit-modal.md))
And it must accept these props:
  - initialValues?: Partial<TransactionFormValues>           — pre-fill any subset of fields
  - onSubmit: (values: TransactionFormValues) => void        — required submit handler
  - onDelete?: () => void                                    — when provided, renders the delete action beside save
  - submitLabel?: string                                     — overrides the save button label (defaults to "create.save")
  - deleteLabel?: string                                     — overrides the delete button label (defaults to "edit.delete")
  - isSubmitting?: boolean                                   — drives the save button's loading state
  - isDeleting?: boolean                                     — drives the delete button's loading state
  - errorMessage?: string | null                            — when set, renders an inline error banner above the footer
And the screen title and header close button are owned by the (modals) group layout, NOT the form
  (the route sets `Stack.Screen` options.headerTitle); there is no `title`, `onClose`, or `autoFocusAmount` prop
And TransactionFormValues is the shape consumed and produced by both modals:
  { type: "expense" | "income"; amountCents: number; date: Date; categoryId: string | null; description: string }
```

See the [Edit Modal spec](edit-modal.md) for the edit-mode contract that shares this form.
