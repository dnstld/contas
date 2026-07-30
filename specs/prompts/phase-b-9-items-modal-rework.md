# Prompt — Category items modal: footer CTA, conditional tabs, empty banner

> Paste this to the coding agent. Rework `app/(modals)/category-items.tsx`: move "＋ New item" to a pinned footer using `ModalActions` (like create-transaction), show the Active/Archived tabs only when something is archived, and replace the empty state with a welcome banner. Reuse existing primitives. No suggestions.

## Final behavior (states)

| Condition | Tabs shown? | Body | Footer "＋ New item" |
|---|---|---|---|
| No items at all | No | Empty-items banner | Enabled |
| `archived = 0`, `active > 0` | No | Active items list | Enabled |
| `archived > 0`, Active tab, `active > 0` | Yes | Active items list | Enabled |
| `archived > 0`, Active tab, `active = 0` | Yes | Empty-items banner | Enabled |
| `archived > 0`, Archived tab | Yes | Archived items list | Enabled |
| Loading | No | Spinner | Enabled |

Rules:
- **Tabs (`SegmentedControl`) appear only when `archived > 0`.** There is no empty-Archived state (unreachable), so no archived-empty banner.
- **Footer "＋ New item" is enabled everywhere.** Pressing it sets the segment to `active`, then opens the item form (`categoryItemFormHref({ categoryId: id, bridgeId })`), so the user returns to the Active tab with the new item (list refreshes via the existing `categoryItemFormBridge` subscription).
- **Transient reset:** if `archived` becomes 0 while the Archived tab is selected (un-archived/deleted the last one), reset the segment to `active` (a `useEffect` on `hasArchived`).

## 1. Extend `ModalActions` to allow a primary icon

In `components/ui/molecules/modal-actions.tsx`, add optional `iconName?: IconName` (from `@/components/ui/atoms/icon`) to `ModalPrimaryAction`, and pass it to the primary `PressableButton` (`iconName={primary.iconName}`). Optional, so existing callers are unaffected.

## 2. Rework `app/(modals)/category-items.tsx`

Structure: a `flex:1` root with a fixed segmented control (when shown), a scrolling body (list or banner), and a `StickyFooter` holding `ModalActions`.

- Imports: `ActivityIndicator` (rn), `StickyFooter` (`@/components/ui/molecules/sticky-footer`), `ModalActions` + `Surface` (`@/components/ui`), `NotificationBanner` (`@/components/ui/molecules/notification-banner`). Remove the old `PressableButton` add-button and the `EmptyState` usage.
- Data/state:
  - `const { data: allItems = [], isLoading, refetch } = useCategoryItems();`
  - `active` / `archived` split by `archivedAt`; `hasArchived = archived.length > 0`.
  - `const [segment, setSegment] = useState<'active'|'archived'>('active');`
  - `const [footerOverlap, setFooterOverlap] = useState(0);`
  - `useEffect(() => { if (!hasArchived && segment === 'archived') setSegment('active'); }, [hasArchived, segment]);`
  - Keep the existing `categoryItemFormBridge` subscription (`changed → refetch`).
- Derived: `const showTabs = hasArchived;` `const visible = segment === 'archived' ? archived : active;` `const showBanner = segment === 'active' && active.length === 0;`
- Render:

```tsx
<View style={[styles.root, { backgroundColor }]}>
  <Stack.Screen options={{ headerTitle: category?.name ?? '' }} />

  {isLoading ? (
    <View style={styles.centered}><ActivityIndicator /></View>
  ) : (
    <View style={styles.body}>
      {showTabs ? (
        <View style={styles.tabs}>
          <SegmentedControl<Segment> options={segmentedOptions} value={segment} onChange={setSegment} />
        </View>
      ) : null}

      {showBanner ? (
        <View style={styles.bannerWrap}>
          <Surface variant="plain" bordered padding={16}>
            <NotificationBanner
              title={t('categoryItems.welcome.title')}
              subtitle={t('categoryItems.welcome.body')}
            />
          </Surface>
        </View>
      ) : (
        <SectionList<Row>
          variant="flat"
          sections={[{ id: segment, data: visible }]}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: footerOverlap + 16 }]}
          renderItem={/* unchanged row: name, recurrence line, amount, chevron, onPress→edit */}
        />
      )}
    </View>
  )}

  <StickyFooter onOverlapChange={setFooterOverlap}>
    <ModalActions
      primary={{
        label: t('categoryItems.addItem'),
        iconName: 'plus',
        onPress: () => {
          setSegment('active');
          router.push(categoryItemFormHref({ categoryId: id, bridgeId }));
        },
      }}
    />
  </StickyFooter>
</View>
```

- Styles: `root: { flex: 1 }`, `body: { flex: 1 }`, `centered: { flex: 1, alignItems: 'center', justifyContent: 'center' }`, `tabs: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }`, `bannerWrap: { padding: 16 }`, keep `listContent`. Remove now-dead styles (old `listHeader`, `createRow`, `emptyWrap`, etc.).

## 3. i18n

- Add `categoryItems.welcome.title` / `.body` in all three locales.
- Remove the now-unused `categoryItems.empty.*` and `categoryItems.emptyArchived.*` (grep-verify).

Copy:

- **en** — title: `Add items to this category`; body: `Items are what you spend on here, like Netflix in Subscriptions. Adding them gives you quick suggestions when logging transactions.`
- **pt-BR** — title: `Adicione itens a esta categoria`; body: `Itens são o que você gasta aqui, como Netflix em Assinaturas. Adicioná-los gera sugestões rápidas ao registrar transações.`
- **de** — title: `Füge dieser Kategorie Einträge hinzu`; body: `Einträge sind das, wofür du hier ausgibst, z. B. Netflix in Abos. Sie liefern dir schnelle Vorschläge beim Erfassen von Transaktionen.`

## Acceptance

- A category with no items shows only the banner (no tabs) with a pinned "＋ New item" footer; creating one shows it in the active list.
- Tabs appear only once at least one item is archived; the Archived tab always has items; un-archiving the last archived item hides the tabs and returns to Active.
- The Active tab with everything archived shows the empty-items banner.
- "＋ New item" is enabled on every state and always lands you on the Active tab with the new item.
- Old `categoryItems.empty.*` / `emptyArchived.*` removed; `categoryItems.welcome.*` added. Repo typecheck passes; ESLint clean; no console errors.
