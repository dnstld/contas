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
Then it must present with the same modal transition the Create Modal uses (the "(modals)" group is
  registered with `presentation: 'modal'` in app/_layout.tsx)
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
Then it must read the transaction via the useTransaction(id) query, mapped through toQueryView
And while the query is pending it renders an EditSkeleton (a placeholder matching the form's shape)
And on query error it renders an ErrorEmptyState with a retry action; on a stale background refetch
  it renders a StaleDataBanner above the pre-filled form

Given that no matching transaction exists for the supplied id (the query resolves empty)
When the empty state is observed
Then the screen must call router.back() and render nothing
  (the user is bounced back to the previous screen, no error UI is shown)
```

### Pre-filling the form from the transaction

```
Given that the target transaction has been resolved
When the TransactionForm is rendered
Then it must receive initialValues populated from the transaction record:
  - type        ← transaction.type
  - amountCents ← Math.round(transaction.amount * 100)
  - date        ← txDate(transaction)   (the shared transaction→Date helper)
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
```

### Form structure and section order (shared with Create)

```
Given that the edit modal is visible
When the form is rendered
Then the field set, section order, and visual hierarchy must be identical to the Create Modal:
  - screen title + close button in the (modals) group header
  - transaction type selector
  - amount input (large, centered, locale-formatted decimal + currency code)
  - date selector (inline, always visible)
  - category selector row + quick-pick chips (single selection, filtered by current type)
  - description input (free text, max 100 chars, with caption and counter)
And the ModalFormScaffold sticky footer must contain the delete AND save actions, side by side
  (delete on the left, save on the right)
And every shared behavior — amount entry, category selection via the category-select route, description counter,
  keyboard layout — is governed by the [Create Modal spec](create-modal.md) and applies here verbatim
```

### Category — pre-selected from the transaction

```
Given that the edit modal opens with a resolved transaction
When the category section is rendered
Then the CategorySelect row must show the transaction's existing category name as the selected value
  from the very first frame (initialValues.categoryId)
And if that category is among the top-5 quick-pick chips for the current type, its chip renders selected
And the selection persists for the edit session; it resets only if the user switches the transaction type
And category create/edit is reached through the category-select / category-form routes exactly as in create
  (the form has no long-press-to-edit) — see the [Create Modal spec](create-modal.md)
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
Then the handler must UPDATE the transaction in Supabase (useUpdateTransaction)
And the transactions TanStack Query cache must be invalidated on success
And on success it shows a success toast (key "feedback.transactionUpdated") and dismisses the modal (router.back)
And the underlying Transactions screen must reflect the updated transaction on its next render
And if the update fails, an inline error banner must appear above the footer: "edit.demoReadOnly" when Demo
  mode is read-only, otherwise the localized key from `mapSupabaseErrorKey(error)` — the modal stays open
```

### Delete action — visual treatment

```
Given that the edit modal is rendered
When the delete action is displayed
Then it must render in the ModalFormScaffold sticky footer, to the LEFT of the save action (both in one row)
And it must be the shared PressableButton with variant="destructive" and size="large"
  (Liquid Glass destructive treatment — negative tint / role, see [Design System spec](design-system-liquid-glass.md))
And its label must come from key "edit.delete" (en: "Delete" / pt-BR: "Excluir")
And it drives its loading state from the isDeleting prop
And the delete action is rendered if and only if the TransactionForm receives an onDelete prop (edit passes one; create does not)
```

### Deleting a transaction

```
Given that the edit modal is rendered with a resolved transaction
When the user taps the delete action
Then it must first prompt a confirm Alert (title "edit.deleteConfirmTitle", message "edit.deleteConfirmMessage",
  actions "edit.deleteConfirmAction" / "edit.deleteConfirmCancel")
And on confirm the handler must DELETE the transaction from Supabase (useDeleteTransaction)
And the transactions TanStack Query cache must be invalidated on success
And on success it shows a success toast (key "feedback.transactionDeleted") and dismisses the modal (router.back)
And the underlying Transactions screen must no longer include the deleted transaction on its next render
And if the deletion fails, an inline error banner must appear above the footer: "edit.demoReadOnly" when Demo
  mode is read-only, otherwise the localized key from `mapSupabaseErrorKey(error)`
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
And the footer (delete + save actions) must stay anchored above the keyboard via the ModalFormScaffold's
  sticky footer (react-native-keyboard-controller — never a KeyboardAvoidingView)
And scrolling reliably engages within the remaining space — the delete button never causes content to be
  hidden behind the header or overlap with the footer
```

### Localization

```
Given that the active language is one of the supported languages
When the edit modal is rendered
Then every user-facing string must be sourced from i18next
And the edit-specific keys are:
  - title:               "edit.title" (en: "Edit Transaction")
  - save action label:   "edit.save" (en: "Save changes")
  - delete action:       "edit.delete"
  - delete confirm:      "edit.deleteConfirmTitle" / "edit.deleteConfirmMessage" /
                         "edit.deleteConfirmAction" / "edit.deleteConfirmCancel"
  - demo read-only error: "edit.demoReadOnly"
  - success toasts:      "feedback.transactionUpdated" / "feedback.transactionDeleted"
And update/delete failures otherwise render the localized key from `mapSupabaseErrorKey(error)`
  (the "edit.updateError" / "edit.deleteError" strings still exist but are not the current inline-error source)
And category create/edit keys ("category.*", "categorySelect.*") apply through the category-select /
  category-form routes — see the [Create Modal spec](create-modal.md) for the full list
And every other label (section labels, type options, description caption / counter)
  comes from the shared "create.*" keyset — see the [Create Modal spec](create-modal.md)
And monetary formatting follows the [Localization spec](localization.md)
And changing the active language or currency from Settings must update every label and reformat the amount in place,
  without losing in-progress edits and without requiring an app restart
```

See the [Create Modal spec](create-modal.md) for the field-level behavior shared by both modals.
