# Prompt — Categories empty state: welcome banner + starter-category suggestions

> Paste this to the coding agent. Replaces the "No categories yet" empty state on the Categories tab with an Overview-style welcome banner **plus** tappable starter-category suggestions (grouped Expenses/Income, each with a ＋ to create). Also removes the now-redundant in-form name suggestions. Reuse existing patterns. (Supersedes the earlier banner-only prompt.)

## 1. `app/(tabs)/categories/index.tsx` — new empty state

Replace the empty branch (`if (categories.length === 0) { … centered EmptyState … }`) with a **top-aligned** layout (same container/scroll as the list branch) showing the banner and a suggestions list:

```tsx
if (categories.length === 0) {
  const parseSuggestions = (type: 'expense' | 'income') =>
    t(`categorySelect.suggestions.${type}`).split(',').map((s) => s.trim()).filter(Boolean);

  const suggestionRow = (type: 'expense' | 'income') => (name: string): Row => ({
    id: `sugg-${type}-${name}`,
    title: name,
    trailing: <Icon name="plus" size={20} tone="tint" />,
    onPress: () => router.push(categoryFormHref({ type, prefillName: name, bridgeId })),
  });

  const suggestionSections: SectionListSection<Row>[] = [
    { id: 'sugg-expense', title: t('categoriesTab.sections.expenses'), data: parseSuggestions('expense').map(suggestionRow('expense')) },
    { id: 'sugg-income',  title: t('categoriesTab.sections.income'),   data: parseSuggestions('income').map(suggestionRow('income')) },
  ];

  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Surface variant="plain" bordered padding={16}>
          <NotificationBanner
            title={t('categoriesTab.welcome.title')}
            subtitle={t('categoriesTab.welcome.body')}
          />
        </Surface>
        <SectionList<Row>
          variant="card"
          scrollEnabled={false}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          sections={suggestionSections}
        />
      </ScrollView>
    </View>
  );
}
```

- Import `Surface` (from `@/components/ui`) and `NotificationBanner` (`@/components/ui/molecules/notification-banner`), mirroring `app/(tabs)/(status)/index.tsx`. `Icon`, `SectionList`, `categoryFormHref`, `renderRow`, `keyExtractor` are already available.
- Remove the now-unused `EmptyState` import and the `emptyState` style.
- Tapping a suggestion opens the existing `category-form` pre-filled (`prefillName` + `type`); on create it emits `created` on the tab's `categoryFormBridge` (already subscribed → `refetch`), so the tab switches to the real list. Not centered — top-aligned under the header.

## 2. Remove redundant in-form name suggestions — `app/(modals)/category-form.tsx`

Now that suggestions are surfaced on the Categories tab (and the transaction-form quick-pick), the category form's inline starter-name chips are redundant. Stop passing them: remove the `nameSuggestions={nameSuggestions}` prop on `<CategoryFields …>` and delete the `nameSuggestions` `useMemo`. Leave the `CategoryFields` `nameSuggestions` prop itself in place (still supported, just unused here).

## 3. i18n

- Add `categoriesTab.welcome.title` / `.body` (copy A below) to all three locales.
- Remove the now-unused `categoriesTab.empty.title` / `.subtitle` (grep-verify unused).
- Reuse existing `categoriesTab.sections.expenses` / `.income` and `categorySelect.suggestions.expense` / `.income` (no changes).

Copy A:

- **en** — title: `Start with categories`; body: `Categories group your transactions — like Groceries or Salary. Tap a suggestion below to add it, or create your own with ＋ Category.`
- **pt-BR** — title: `Comece com categorias`; body: `Categorias agrupam suas transações — como Mercado ou Salário. Toque em uma sugestão abaixo para adicioná-la, ou crie a sua com ＋ Categoria.`
- **de** — title: `Beginne mit Kategorien`; body: `Kategorien gruppieren deine Transaktionen – z. B. Lebensmittel oder Gehalt. Tippe unten auf einen Vorschlag, um ihn hinzuzufügen, oder erstelle mit ＋ Kategorie eine eigene.`

## Acceptance

- Empty Categories tab shows the welcome banner (logo + copy A) at the top, then **Expenses** and **Income** sections listing starter categories, each row with a trailing ＋; tapping a row opens the pre-filled create form and, on save, the tab shows the real list.
- The category-form no longer shows starter-name chips under the name input (removed everywhere).
- `categoriesTab.empty.*` removed; `categoriesTab.welcome.*` added in all locales; no in-use key removed.
- Repo typecheck passes; ESLint clean; no console errors.
