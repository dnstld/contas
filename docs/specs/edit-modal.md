# Component 11 — Edit Modal (Editar)

The "Editar" modal is the mutation entry point for an existing transaction. It is invoked by tapping a row in the [Transactions screen](transactions.md) and presented as a full-screen modal above that tab.

The route lives at `app/(modals)/edit.tsx` (URL: `/edit?id=<transactionId>`). It renders the same shared [`TransactionForm`](../../components/transactions/transaction-form.tsx) component used by the [Create Modal](create-modal.md), passing it the existing transaction's values as `initialValues` and adding a destructive **delete** action to the footer.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Route exists and is reachable

```
Given that the user is anywhere in the app and a transaction id is known
When the user navigates to the route /edit?id=<transactionId>
Then the edit modal screen must mount and render
And no error must be thrown for missing routes or layouts
```

### Presentation style

```
Given that the user taps a row on the Transactions screen
When the modal is presented
Then it must use the same SlideFromBottom transition that the Create Modal uses (defined in app/_layout.tsx)
And the underlying tab must remain mounted in the stack underneath the modal
And the modal must not replace the underlying screen
And the previously selected tab must be preserved after dismissal
```

### Entry from a transaction row

```
Given that the Transactions screen is rendered and at least one row is visible
When the user taps anywhere on a transaction row
Then the app must push the /edit route with that row's transaction id as the `id` query parameter
  (router.push({ pathname: "/edit", params: { id: <row.id> } }))
And the press must show the row's standard tap feedback (opacity 0.6 while pressed)
And the row must be the entire press target — there is no secondary action button on the row
And no other affordance (ellipsis menu, swipe action, long-press) is wired in the current scope
```

### Resolving the target transaction

```
Given that the edit modal mounts with an `id` query parameter
When the screen resolves the transaction
Then it must read the current finance mock via useFinanceMock
And it must find the transaction whose `id` matches the route parameter
And the lookup must be memoized on (transactions, id)

Given that no matching transaction exists for the supplied id
When the resolution result is empty
Then the screen must immediately call router.back() and render nothing
  (the user is bounced back to the previous screen, no error UI is shown)
```

### Pre-filling the form from the transaction

```
Given that the target transaction has been resolved
When the TransactionForm is rendered
Then it must receive initialValues populated from the transaction record:
  - type        ← transaction.type
  - amountCents ← Math.round(transaction.amount * 100)
  - date        ← new Date(transaction.date ?? transaction.startDate ?? transaction.nextOccurrence ?? Date.now())
  - categoryId  ← transaction.categoryId
  - description ← transaction.description
And the form must show those values on its very first render (no flash of empty defaults)
```

### Edit mode does NOT auto-focus the amount

```
Given that the edit modal opens with the form pre-filled
When the form mounts
Then the amount input must NOT auto-focus
And the keyboard must NOT open automatically
And the user is free to scan the pre-filled fields before deciding what to edit
And this is wired by passing autoFocusAmount={false} to TransactionForm
  (the Create Modal omits this prop and relies on the default true — see [Create Modal spec](create-modal.md))
```

### Form structure and section order (shared with Create)

```
Given that the edit modal is visible
When the form is rendered
Then the field set, section order, and visual hierarchy must be identical to the Create Modal:
  - close action + screen title in the header
  - transaction type selector
  - amount input (large, centered, locale-formatted)
  - date selector (inline, always visible)
  - category chips (single selection, filtered by current type)
  - description input (free text, max 100 chars, with caption and counter)
And a fixed footer at the bottom must contain the save AND delete actions, in that order
And every shared behavior — amount masking, category single-selection, description counter, keyboard layout —
  is governed by the [Create Modal spec](create-modal.md) and applies here verbatim
```

### Screen title and submit label

```
Given that the edit modal is rendered
When the header title is displayed
Then it must come from key "edit.title"
  (en: "Edit transaction" / pt-BR: "Editar transação")

When the save action label is rendered
Then it must come from key "edit.save"
  (en: "Save changes" / pt-BR: "Salvar alterações")
And the save action's visual treatment (full-width green pill, checkmark icon, shadow, press feedback)
  is identical to the Create Modal — only the label string differs
```

### Save action — enablement

```
Given that the edit modal is rendered
When the save action enablement is evaluated
Then the same rules as Create apply:
  - amountCents > 0, AND
  - a category is selected
And in practice the form opens in an already-valid state because it was pre-filled from a real transaction
And as soon as the user clears the amount or deselects the category, the save action must dim to 50% opacity and stop dispatching
```

### Saving an edit

```
Given that the form is in a valid state
When the user taps the save action
Then the screen's onSubmit handler must be invoked synchronously with the current values
And the handler must close the modal (router.back) once the update is dispatched
And the underlying Transactions screen must reflect the updated transaction on its next render
  (driven by the same data source the screen already reads from)
And persistence of the update is intentionally out of scope here — the current implementation logs the payload
  with the transaction id and dismisses the modal. The real persistence layer will live behind the same handler and is tracked separately.
```

### Delete action — visual treatment

```
Given that the edit modal is rendered
When the delete action is displayed
Then it must render in the fixed footer, BELOW the save action
And it must be visually distinct from save and clearly destructive:
  - full-width pill with the same border-radius as save
  - hairline border tinted with the theme's negative (red) color
  - transparent background by default; on press, a 8%-opacity tint of the negative color fills the pill
  - label from key "edit.delete" (en: "Delete" / pt-BR: "Excluir"), rendered in semibold red "subtitle" typography
And on press the pill must scale to 0.98 for tactile feedback (matching save's press behavior)
And the delete action is rendered if and only if the TransactionForm receives an onDelete prop (edit passes one; create does not)
```

### Deleting a transaction

```
Given that the edit modal is rendered with a resolved transaction
When the user taps the delete action
Then the screen's onDelete handler must be invoked synchronously
And the handler must close the modal (router.back) once the deletion is dispatched
And the underlying Transactions screen must no longer include the deleted transaction on its next render
And persistence of the deletion is intentionally out of scope here — the current implementation logs the transaction id
  and dismisses the modal. The real persistence layer will live behind the same handler and is tracked separately.
```

### Dismissal — back to the underlying tab

```
Given that the edit modal is open
When the user dismisses the modal (via the in-screen close button, the swipe-down gesture, or the system back action — without saving or deleting)
Then the modal must be removed from the navigation stack
And the user must return to the Transactions tab at the same scroll position and filter state as before
And no in-flight changes to the form must be persisted (the underlying transaction is unchanged)
And no residual UI must remain on screen after dismissal
```

### Layout under the keyboard

```
Given that the user focuses the description (or any field that opens the keyboard)
When the form layout settles
Then the form-fields region must remain scrollable independently of the footer
And the footer (save + delete actions) must remain anchored at the bottom of the screen above the keyboard
  on platforms where KeyboardAvoidingView padding is applied (iOS)
And the ScrollView's height must remain bounded by the parent (KeyboardAvoidingView height minus the footer height)
  so scrolling reliably engages — the addition of the delete button never causes content to be hidden behind the header
  or overlap with the footer
```

### Localization

```
Given that the active language is one of the supported languages
When the edit modal is rendered
Then every user-facing string must be sourced from i18next
And the edit-specific keys are:
  - title:             "edit.title"
  - save action label: "edit.save"
  - delete action:     "edit.delete"
And every other label (section labels, type options, description caption / counter, category empty state)
  comes from the shared "create.*" keyset — see the [Create Modal spec](create-modal.md)
And monetary formatting follows the [Localization spec](localization.md)
And changing the active language or currency from Settings must update every label and reformat the amount in place,
  without losing in-progress edits and without requiring an app restart
```

See the [Create Modal spec](create-modal.md) for the field-level behavior shared by both modals.
