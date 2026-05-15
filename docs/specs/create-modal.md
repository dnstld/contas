# Component 6 — Create Modal (Adicionar)

The "Adicionar" modal is the primary mutation entry point of the app. It is invoked from the Balanço header's "+ Adicionar" button and presented above the Balanço stack.

The route itself lives at `app/(modals)/create.tsx` (URL: `/create`) and is currently a placeholder screen. This spec pins down the trigger, presentation, and dismissal contracts so the future form implementation can extend it without breaking those guarantees.

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
Given that the user taps the Balanço header "Adicionar" button
When the modal is presented
Then it must use the SlideFromBottom transition declared in app/_layout.tsx
And the Balanço screen must remain mounted in the stack underneath the modal
And the modal must not replace the Balanço screen (it is presented on top, not navigated to)
And the modal must visually occupy the screen above the underlying Balanço content
```

### Dismissal — back to Balanço

```
Given that the create modal is open
When the user dismisses the modal (via the in-screen "Go to home screen" link, swipe-down gesture, or system back action)
Then the modal must be removed from the navigation stack
And the user must return to the Balanço screen at the same scroll position and filter state as before
And the modal must not leave any residual UI on screen after dismissal
```

### Modal is independent of tab navigation

```
Given that the create modal is open
When the user attempts to interact with the bottom tab bar
Then the tab bar must remain hidden or non-interactive while the modal covers it
  (modal presentation is full-screen above the tab navigator)
And the previously selected tab must be preserved after dismissal
```

### Modal does not pollute deep links

```
Given that the user opens the app via a deep link or cold start
When no explicit /create link is in the deep-link path
Then the create modal must NOT be auto-presented
And it must only open as a direct response to a user action (Adicionar button tap or explicit programmatic push)
```

### Placeholder content (current scope)

```
Given that the modal implementation is in its placeholder state
When the modal is rendered
Then it must show the title text "This is a modal"
And it must show a tappable link "Go to home screen"
And tapping the link must call `router.dismissTo` and return to the Balanço screen
(This entire scenario is provisional and will be replaced by the real "Adicionar" form spec
once the form's fields, validation, and persistence are designed.)
```

## Future scope — to be filled in when the real form is built

The following areas are intentionally undefined here and must be specified before the real form ships:

- Form fields (transaction name, amount, category, date, type expense vs revenue).
- Field validation rules (required fields, amount range, date constraints).
- Submission behavior (where the record is persisted, success/error feedback).
- Cancel vs submit affordances and their respective dismissal behaviors.
- Localization of all form labels and error messages (pt-BR).
- Behavior when the user has unsaved changes and attempts to dismiss.
