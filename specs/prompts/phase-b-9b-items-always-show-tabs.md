# Prompt — Category items modal: always show the tabs (re-add archived-empty banner)

> Paste this to the coding agent. Small revision to `app/(modals)/category-items.tsx`: the Active/Archived `SegmentedControl` is now **always shown** (not gated on archived count). This reintroduces the empty-Archived state, so add an archived-empty banner. Everything else from the previous step stays.

## Changes

1. **Always render the tabs.** Remove the `showTabs`/`hasArchived` gating around the `SegmentedControl` — render it unconditionally (still hidden only during loading). Remove the now-unused `hasArchived` variable and the transient `useEffect` that reset the segment to `active` when `archived` hit 0 (no longer needed — staying on the Archived tab with zero items is now valid).

2. **Banner depends on the selected tab.** Replace the `showBanner = segment === 'active' && active.length === 0` logic with: show a banner whenever the **visible** list is empty, choosing the copy by segment:

```tsx
const visible = segment === 'archived' ? archived : active;
const isEmpty = visible.length === 0;
// when isEmpty:
//   segment === 'active'   → welcome banner (categoryItems.welcome.*)
//   segment === 'archived' → archived-empty banner (categoryItems.archivedEmpty.*)
```

Both render as `NotificationBanner` in the bordered `Surface`, same as now.

3. **Footer unchanged:** "＋ New item" stays in the `StickyFooter` `ModalActions`, enabled everywhere, still setting the segment to `active` before opening the item form.

## i18n — add the archived-empty copy

Add `categoryItems.archivedEmpty.title` / `.body` to all three locales (keep `categoryItems.welcome.*`):

- **en** — title: `No archived items`; body: `Archive an item to hide it from suggestions without losing its history.`
- **pt-BR** — title: `Nenhum item arquivado`; body: `Arquive um item para ocultá-lo das sugestões sem perder seu histórico.`
- **de** — title: `Keine archivierten Einträge`; body: `Archiviere einen Eintrag, um ihn aus den Vorschlägen auszublenden, ohne seinen Verlauf zu verlieren.`

## Acceptance

- The Active/Archived tabs are always visible (except during loading).
- Active tab with no active items → welcome banner; Archived tab with no archived items → archived-empty banner; otherwise the respective list.
- "＋ New item" still enabled on both tabs and lands on Active with the new item.
- `categoryItems.archivedEmpty.*` added in all locales; `categoryItems.welcome.*` kept. Repo typecheck passes; ESLint clean; no console errors.
