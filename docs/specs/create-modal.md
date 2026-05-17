# Component 6 — Create Modal (Adicionar)

The "Adicionar" modal is the primary mutation entry point of the app. It is invoked from the global header's "+ Adicionar" button (see the [App Shell spec](app-shell.md)) and presented above whichever tab is currently active.

The route lives at `app/(modals)/create.tsx` (URL: `/create`). It renders the shared [`TransactionForm`](../../components/transactions/transaction-form.tsx) component with create-mode defaults. The same form component is reused by the [Edit Modal](edit-modal.md), so any change to the field set, layout, or interaction model applies to both surfaces.

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
Then it must use the SlideFromBottom transition declared in app/_layout.tsx
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
Then it must display the following sections from top to bottom, in this exact order:
  1. A close action (left-aligned) and the screen title from key "create.title" (centered)
     (en: "New transaction" / pt-BR: "Nova transação")
  2. Transaction type selector
  3. Amount input
  4. Date selector
  5. Category chips
  6. Description input
And a fixed footer at the bottom of the screen must contain the save action
And the footer must remain visible while the form scrolls (the action is never pushed off-screen)
```

### Modal opens focused on the amount

```
Given that the user taps the "Adicionar" button
When the create modal mounts
Then focus must be moved to the amount input within a brief timeout (≈50 ms after mount)
And the platform numeric keyboard must open automatically as a consequence of that focus
And no other field may receive focus first
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

### Amount input — currency formatting

```
Given that the amount input is rendered or focused
When the user types numeric values
Then the displayed value must format as a currency string in real time
And formatting must use Intl.NumberFormat with:
  - the active language as the locale (separators follow the language)
  - the user-selected currency as the currency code (symbol follows the currency)
And the input keyboard must be numeric-only (number-pad on iOS / inputMode="numeric" on Android)
And input handling must strip every non-digit character before parsing — the parsed integer represents the amount in cents
And the displayed value must always be a valid currency string for the active locale + currency
  (e.g. pt-BR + BRL → "R$ 0,00" → "R$ 0,01" → "R$ 0,12" → "R$ 1,23" → "R$ 12,34" as digits 1, 2, 3, 4 are typed)
And invalid intermediate strings (e.g. "R$ 12,," or unfinished separators) must never be visible
And changing the user's language or currency in Settings must reformat the visible amount instantly without losing the underlying value
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

### Category chips — starter categories

```
Given that the create modal is visible
When category chips are rendered
Then the following categories are seeded per wallet and always available:
  - Bar / Café (type: "expense") — seeded by the wallets_after_insert trigger
And in Demo mode, the full demo category list is available, filtered to the chips that match the current type
```

### Category chips — single selection

```
Given that one or more category chips are visible
When the user taps a chip
Then that chip must enter the active visual state
And any previously selected chip must return to its inactive state (only one chip may be selected at a time)
And the selected category must become associated with the transaction
And tapping the already-selected chip must deselect it (the form returns to the "no category" state)
```

### Category chips — create new category

```
Given that the category section is rendered (regardless of how many categories exist)
When the chip row is displayed
Then a "+ Add" chip (key "category.create.chipLabel") must appear at the START of the row, before all other chips
And tapping it must open the CategoryFormModal in create mode

When the CategoryFormModal is open in create mode
Then it must contain:
  - A title from key "category.create.title"
  - A "Name" field with label (key "category.create.nameLabel"), a text input
      (placeholder from "category.create.namePlaceholder"), and a caption below
      (key "category.create.nameCaption")
  - A "Monthly budget" field with label (key "category.create.budgetLabel"), a numeric
      currency input (symbol prefix + amount), and a caption below
      (key "category.create.budgetCaption") — this field is optional
  - A Cancel button (key "category.create.cancel") and a Create button
      (key "category.create.createButton" / "category.create.creating" while pending)
And both inputs must render as rounded filled boxes with the surfaceMuted background colour
And the Create button must be disabled while the name is empty or the mutation is in flight

When the user submits a valid name
Then the mutation must INSERT the new category into Supabase with the current transaction type
And the categories TanStack Query cache must be invalidated on success
And the new category must be auto-selected (categoryId set to the returned id)
And the new category chip must appear immediately after the "+ Add" chip (position 1),
  ahead of all pre-existing chips, for the duration of this form session
And the modal must close automatically on success

When the user switches the transaction type
Then the pinned new-category position must reset (the type change clears the selection anyway)
```

### Category chips — long-press to edit

```
Given that the category section has one or more chips
When the chip row is displayed
Then a "Press and hold to edit" caption (key "category.pressAndHoldHint") must appear
  as a muted hint below the chip row
And long-pressing any category chip for ≥ 500 ms must open the CategoryFormModal in edit mode,
  pre-filled with that category's name and monthly budget

When the CategoryFormModal is open in edit mode
Then it must display:
  - A title from key "category.edit.title"
  - The same Name and Monthly budget fields as in create mode, pre-filled with the category's current values
  - A Save button (key "category.edit.saveButton" / "category.edit.saving" while pending)
  - A Delete button (key "category.edit.delete" / "category.edit.deleting" while pending)
    rendered below the Save action, styled with the theme's negative (red) colour
    — the Delete button must NOT be rendered if this is the last category of its type
And the Save button must be disabled while the name is empty or a mutation is in flight

When the user saves valid changes
Then the mutation must UPDATE the category's name and monthly_budget_cents in Supabase
And if monthly budget is cleared (set to 0), the column must be set to NULL
And the categories TanStack Query cache must be invalidated on success
And the modal must close automatically

When the user taps Delete on a category that has associated transactions
Then the mutation must first query the count of transactions referencing that category
And if count > 0, an inline warning must appear inside the modal:
  (singular) "category.edit.hasTransactions_one" — e.g. "1 transaction must be deleted before deleting this category."
  (plural)   "category.edit.hasTransactions_other" — e.g. "32 transactions must be deleted before deleting this category."
And the category must NOT be deleted

When the user taps Delete on a category with zero transactions
Then the category must be deleted from Supabase
And the categories TanStack Query cache must be invalidated
And if the deleted category was currently selected in the form, the form must deselect it (categoryId → null)
And the modal must close automatically

Invariant: each transaction type must always have at least one category.
The Delete button is therefore hidden (not rendered) when the category being edited
is the only remaining category of its type (expense or income).

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
Then it must render as a full-width pill in the fixed footer below the form
And the pill background must use the theme's positive (green) color
  (Colors.light.positive in light mode / Colors.dark.positive in dark mode)
And the pill must display a leading "checkmark" icon (SF Symbol "checkmark" / Material "check") in white
And the pill label must come from key "create.save" (en: "Save" / pt-BR: "Salvar"), rendered in bold white "subtitle" typography
And the pill must cast a soft green-tinted shadow (iOS) / elevation (Android) for depth
And when pressed it must scale down to 0.98 and ease its shadow opacity to give a tactile press response
```

### Save action — enablement

```
Given that the save action is rendered
When the form state changes
Then the save action must be enabled if and only if:
  - amountCents > 0, AND
  - a category is selected
And while disabled, the pill must remain green but render at 50% opacity (clearly inactive but still affording its role)
And while disabled, taps must not dispatch the submit handler
And the type selector, date, and description never block enablement on their own
  (type defaults to "expense", date defaults to "now", description is optional)
```

### Saving a transaction

```
Given that the form is in a valid state (see "Save action — enablement")
When the user taps the save action
Then the modal's onSubmit handler must be invoked synchronously on the same frame, receiving the current values:
  - type ("expense" | "income")
  - amountCents (integer)
  - date (Date)
  - categoryId (string)
  - description (string, possibly empty)
And the handler must INSERT the new transaction into Supabase
And the transactions TanStack Query cache must be invalidated on success
And the modal must close (router.back) once the mutation resolves
```

### Layout under the keyboard

```
Given that the keyboard is visible (because the amount or description input is focused)
When the form layout settles
Then the form fields must remain laid out at their natural size — fields must not visibly compress or overlap each other
And the form-fields region must remain scrollable independently of the footer
And the footer (save action) must remain anchored at the bottom of the screen above the keyboard
  on platforms where KeyboardAvoidingView padding is applied (iOS)
And on Android the platform's adjustResize behavior is allowed to shrink the visible viewport;
  the bounded ScrollView must continue to scroll within the remaining space
```

### Fixed footer vs scrollable form

```
Given that the create modal is rendered
When the layout is computed
Then the modal must be structured as: SafeAreaView(top) → Header → KeyboardAvoidingView → [ScrollView (form fields)] + [View (fixed footer with save)]
And the ScrollView's height must be bounded by the parent (KeyboardAvoidingView height minus the footer height)
  so that scrolling reliably engages whenever the form fields exceed the available area
And a hairline top border separates the footer from the scrollable area for visual anchoring
```

### Localization

```
Given that the active language is one of the supported languages
When the create modal is rendered
Then every user-facing string must be sourced from i18next using these keys:
  - title:                    "create.title"
  - close action label:       "create.close"
  - type options:             "create.types.expense" / "create.types.income"
  - amount accessibility:     "create.amountPlaceholder"
  - date section label:       "create.dateLabel"
  - category section label:   "create.categoryLabel"
  - create category chip:     "category.create.chipLabel"
  - create category modal title: "category.create.title"
  - create category name label/placeholder/caption: "category.create.nameLabel" / "category.create.namePlaceholder" / "category.create.nameCaption"
  - create category budget label/caption: "category.create.budgetLabel" / "category.create.budgetCaption"
  - create category actions:  "category.create.createButton" / "category.create.creating" / "category.create.cancel"
  - category long-press hint: "category.pressAndHoldHint"
  - edit category modal title: "category.edit.title"
  - edit category save button: "category.edit.saveButton" / "category.edit.saving"
  - edit category delete button: "category.edit.delete" / "category.edit.deleting"
  - edit category has-transactions warning: "category.edit.hasTransactions_one" / "category.edit.hasTransactions_other"
  - description placeholder:  "create.descriptionPlaceholder"
  - description caption:      "create.descriptionCaption"
  - description counter:      "create.descriptionCounter" (with {{count}})
  - save action label:        "create.save"
And every monetary value must be formatted via Intl.NumberFormat with the active language and user-selected currency
And changing the active language or currency in Settings must reformat the visible amount and update every label in place,
  without an app restart and without losing in-progress field state
```

### Reusable form contract

```
Given that the form is implemented in components/transactions/transaction-form.tsx
When other entry points need the same form
Then the same component must be reused (the Edit Modal does — see [Edit Modal spec](edit-modal.md))
And it must accept these props:
  - initialValues?: Partial<TransactionFormValues>           — pre-fill any subset of fields
  - onSubmit: (values: TransactionFormValues) => void        — required submit handler
  - onClose?: () => void                                     — optional close handler for the header X
  - onDelete?: () => void                                    — when provided, renders the delete button in the footer
  - title?: string                                           — overrides the screen title (defaults to "create.title")
  - submitLabel?: string                                     — overrides the save button label (defaults to "create.save")
  - deleteLabel?: string                                     — overrides the delete button label (defaults to "edit.delete")
  - autoFocusAmount?: boolean                                — defaults to true; create passes the default, edit passes false
And TransactionFormValues is the shape consumed and produced by both modals:
  { type: "expense" | "income"; amountCents: number; date: Date; categoryId: string | null; description: string }
```

See the [Edit Modal spec](edit-modal.md) for the edit-mode contract that shares this form.
