# Prompt — Fix: Categories empty state (center it + add a create button)

> Paste this to the coding agent. Small UI fix in `app/(tabs)/categories/index.tsx`. A brand-new user (no categories) sees an off-center "No categories yet" message inside a scrollable area, and there's **no button to create a category**. Fix both.

## Change — `app/(tabs)/categories/index.tsx`

Replace the empty-state branch (the `if (categories.length === 0) { return <ScrollView …><EmptyState …/></ScrollView> }`) with a **non-scrolling, fully centered** container that also offers a primary create button:

```tsx
if (categories.length === 0) {
  return (
    <View style={[styles.emptyState, { backgroundColor: background }]}>
      <EmptyState
        icon="tag.fill"
        title={t('categoriesTab.empty.title')}
        body={t('categoriesTab.empty.subtitle')}
      />
      <PressableButton
        variant="primary"
        iconName="plus"
        label={t('categoriesTab.addCategory')}
        onPress={openCategoryForm}
      />
    </View>
  );
}
```

Add the style:

```ts
emptyState: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  gap: 20,
},
```

Notes:
- Use a plain `View` with `flex: 1` (not a `ScrollView`) so it fills the screen area below the header and centers both axes — no stray scroll.
- `openCategoryForm` already exists in the component (opens `category-form` via `categoryFormHref({ bridgeId })`); the existing `categoryFormBridge` subscription already refetches on create, so the new category appears immediately.
- Leave the non-empty branch and its bottom "Add category" button as-is.

## Acceptance

- With zero categories, the message is centered horizontally and vertically with no scrolling, and a primary "＋ New category" button sits just below it that opens the category form.
- Creating the first category dismisses the empty state and shows the list (via the existing bridge refetch).
- Repo typecheck passes; ESLint clean; no console errors.
