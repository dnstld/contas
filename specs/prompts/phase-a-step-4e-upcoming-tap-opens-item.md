# Prompt — Phase A · Step 4e: upcoming row opens the item modal

> Paste this to the coding agent. Small wiring change. Static UI. Tapping a row in the Upcoming detail modal opens the item form (`category-item-form`) in **edit** mode, so the user can edit / archive / delete the item. No logging.

## Change — `app/(modals)/upcoming.tsx`

- Import `useRouter` from `expo-router` and `categoryItemFormHref` from `@/constants/routes`.
- On each `SectionListRow`:
  - Add `trailing={<Icon name="chevron.right" size={16} tone="textMuted" />}` (import `Icon` from `@/components/ui/atoms/icon`) to signal the row is tappable. Keep the existing amount/overdue content in `text1`.
  - Add `onPress={() => router.push(categoryItemFormHref({ categoryId: item.categoryId, editId: item.id }))}`.
- `categoryItemFormHref` already accepts `{ categoryId, editId }` (from Step 3). Modal-over-modal is fine (the app already stacks modals).

## Acceptance

- Tapping any upcoming row opens the item form pre-filled in edit mode for that item (name, amount, recurrence, next-due), with the Save / Archive / Delete actions from `ModalActions`.
- Rows show a chevron; no Log action anywhere.
- No queries/mutations (still static). Repo typecheck passes; ESLint clean; no console errors.
