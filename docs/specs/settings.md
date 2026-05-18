# Component 8 — Account (Conta)

The Account tab is the project's user-identity and preferences surface. It exposes:

1. **Account section** — the signed-in user and (when present) the wallet's second member, with an inline dots menu for edit-name and sign-out actions. A `SectionHeader` with title "Account" and a trailing `members.length/2` count sits above the card.
2. **Wallets section** — an inline `ActionMenu` (ellipsis dots) lets the user switch between wallets (checkmark on active) or create a new one. A `SectionHeader` with trailing `wallets.length/2` count sits above the row. Free tier: max 2 wallets.
3. **Invitation section** — visible only when the active wallet has a single member; lets the user generate a shareable invitation code or redeem one received from a friend. Shows a description and two side-by-side pill buttons.
4. **Display** (pt-BR: "Exibição") — two persisted toggles that affect what the Status screen renders.
5. **Language & currency** (pt-BR: "Idioma e moeda") — language picker and currency picker.
6. **Danger Zone** (pt-BR: "Zona de Perigo") — leave wallet (shared wallets only, when the user has another wallet to fall back to) and delete wallet (with a two-step confirmation flow when the wallet has two members).

> Note on language: this spec uses the English copy because English is the default language. Equivalent Portuguese strings are listed alongside where they're material to the contract. The full string contract lives in `i18n/locales/en.json` and `i18n/locales/pt-BR.json`.

## Shared component: ActionMenu

`ActionMenu` (`components/ui/molecules/action-menu.tsx`) is a reusable ellipsis-dots trigger that opens a native platform menu.

```
Given that an ActionMenu is rendered
When the user taps the ellipsis icon
Then on iOS a SwiftUI.Menu appears (systemImage "ellipsis.circle")
And on Android a Compose.DropdownMenu appears anchored to the trigger

When items are provided with dividerBefore: true
Then iOS groups items into SwiftUI.Section wrappers (native section separators)
And Android inserts a HorizontalDivider before those items

When an item has disabled: true
Then iOS applies the disabled() SwiftUI modifier (button grayed out, non-interactive)
And Android renders the item with enabled={false}

When an item has a subtitle string
Then on iOS a SwiftUI.Text is rendered immediately after the button in the same section
  with font size 12pt
And on Android the subtitle is not shown (disabled state alone communicates the limit)

When an item has destructive: true
Then on iOS the button renders with role="destructive" (red label, native iOS destructive styling)
```

## Scenarios

### Screen placement and chrome

```
Given that the user is logged in
When the Account tab is selected
Then the screen must render its own scrollable layout (no shared header)
And content must scroll independently of the tab bar
And the screen background must use the theme's background color
```

### Section ordering

```
Given that the Account screen is rendered
When its sections are displayed top-to-bottom
Then the order must be:
  1. Account section (SectionHeader + profile card Surface)
  2. Wallets section (SectionHeader + SettingsRow Surface)
  3. Invitation section (only when the active wallet has a single member)
  4. Display (key: "settings.sections.display")
  5. Language & currency (key: "settings.sections.regional")
  6. Danger Zone
And the page-level vertical gap between elements must be 24 points
```

### Profile card — structure

```
Given that the Account screen is rendered
When the Account section is displayed
Then a SectionHeader must appear above the profile Surface with:
  - title from key "settings.sections.account" (en: "Account" / pt-BR: "Conta")
  - trailing: muted caption text showing "{members.length}/2"
And below it a bordered Surface (default tone, no padding, 16-point corner radius) must contain:
  Row 1 — current user identity row (horizontal, items centered, 14-point gap, 16-point horizontal padding, 14-point vertical padding):
    - Avatar (44×44, borderRadius 22):
        If a non-null avatar URL is available:
          render an expo-image <Image> with the URL
        Else:
          render a muted elevated Surface containing the user's initials (first + last word initials, uppercase, max 2 chars)
    - Name/email column (flex: 1):
        Primary text: the user's display name if present, otherwise the user's email (subtitle variant, semibold)
        Secondary text: the user's email (caption variant, muted tone) — only shown when the display name is also present
    - ActionMenu (trailing, right side of the row) with two items:
        1. label from key "profile.actions.editName", systemImage "pencil"
           → opens EditDisplayNameModal
        2. label from key "profile.actions.signOut", systemImage "rectangle.portrait.and.arrow.right", destructive: true
           → calls useAuth().signOut()
  Row 2 — partner identity row (same shape as Row 1, separated by Divider inset 16, no ActionMenu):
    - Rendered ONLY when the active wallet has a second member (useWalletMembers returns more than one entry)
    - Primary text: the partner's display_name from `profiles`, or the fallback key "wallet.partner.unnamed"
    - No actions on this row (partner is read-only from the current user's perspective)
And there must be NO separate actions row with Edit/Sign out buttons at the bottom of the card
```

### Profile card — data sources

```
Given that the profile card is rendered
When identity data is read
Then the current user's display_name and avatar_url must come from the `profiles` table (via useMyProfile)
And if the profile query has not resolved yet, the screen must fall back to session.user.user_metadata.full_name / avatar_url so there is no flash of empty state
And the user's email must come from session.user.email (it is not stored in the `profiles` table)
And the partner's display_name and avatar_url must come from the `profiles` table (via useWalletMembers, which fetches wallet_members then profiles by id)
And membership and profile data must refresh on screen focus (useFocusEffect → refetchMembers) so that newly-joined partners appear without an app relaunch
```

### Profile card — "Edit name" action

```
Given that the profile card is rendered
When the user taps the ActionMenu (ellipsis) and selects "Edit name"
Then the EditDisplayNameModal must become visible
And the modal's text input must be pre-filled with the user's current full_name (or empty if none)
And the input must auto-focus so the keyboard appears immediately
```

### Edit display name modal

```
Given that the EditDisplayNameModal is visible
When the modal is displayed
Then it must render as a bottom sheet:
  - transparent full-screen Modal with fade animation
  - semi-transparent backdrop (rgba 0,0,0,0.4) that dismisses on tap
  - sheet anchored to the bottom with top-left and top-right radius of 20
  - title centered: key "profile.editName.title" (subtitle variant, semibold)
    (en: "Edit name" / pt-BR: "Editar nome")
  - label above the input: key "profile.editName.nameLabel" uppercased, letter-spacing 0.8
    (en: "Name" / pt-BR: "Nome")
  - TextInput pre-filled with the current name, maxLength 80, returnKeyType "done"
    placeholder from key "profile.editName.namePlaceholder"
    (en: "Your name" / pt-BR: "Seu nome")
  - two action buttons (row, 12-point gap):
      Cancel (flex: 1, pill, hairline border): key "profile.editName.cancel" (en: "Cancel" / pt-BR: "Cancelar")
      Save   (flex: 1, pill, positive/green background, white label):
        idle:    key "profile.editName.save"   (en: "Save"    / pt-BR: "Salvar")
        pending: key "profile.editName.saving" (en: "Saving…" / pt-BR: "Salvando…")

Given that the user types a non-empty name and taps Save (or submits via keyboard)
When the save action runs
Then it must update BOTH the auth metadata and the profiles row in parallel:
  - supabase.auth.updateUser({ data: { full_name: trimmedName } })
  - supabase.from('profiles').update({ display_name: trimmedName }).eq('id', session.user.id)
And while either call is in flight the Save button must show the "Saving…" label and be non-interactive
And on success the modal must close
And the TanStack Query caches `my-profile:<userId>` and `wallet-members:<walletId>` must be invalidated
And the profile card's displayed name must update immediately

Given that the name field is empty
When the Save button is evaluated
Then it must be visually dimmed (opacity 0.4) and must not submit

Given that the user taps the backdrop or the Cancel button
When the modal closes
Then no change must be persisted
```

### Profile card — "Sign out" action

```
Given that the profile card is rendered
When the user taps the ActionMenu (ellipsis) and selects "Sign out"
Then useAuth().signOut() must be called
And after sign-out completes, the root layout's route gate must redirect the user to /authentication
```

### Invitation section — visibility

```
Given that the Account screen is rendered
When the active wallet has a single member (the current user)
Then the InvitationSection must render directly below the Wallets section
And when the active wallet has two members, the InvitationSection must NOT render
  (the partner row inside the profile card takes its place)
```

### Invitation section — default state

```
Given that the InvitationSection is rendered and no invitation code has been generated yet
When the user views the section
Then a section label must appear above a muted Surface card
  (key: "wallet.invitation.sectionTitle" — en: "Invite a friend" / pt-BR: "Convidar um amigo")
And the Surface card must contain, top to bottom:
  1. A description text (caption variant, muted tone):
     key: "wallet.invitation.description"
     en: "Share this wallet with a friend to track finances together."
     pt-BR: "Compartilhe esta carteira com um amigo para acompanhar as finanças juntos."
  2. Two pill buttons laid out side-by-side in a horizontal row (10-point gap, each flex: 1):
     Left:  "Generate invitation code" (filled pill in positive/green color, white label)
            (key: "wallet.invitation.inviteButton" — en: "Generate invitation code" / pt-BR: "Gerar código de convite")
     Right: "I have a code" (outlined pill, hairline border in theme border color, muted text)
            (key: "wallet.invitation.haveCodeButton" — en: "I have a code" / pt-BR: "Tenho um código")
And while the invite mutation is in flight the filled pill must display a small ActivityIndicator instead of its label
```

### Invitation section — code generated state

```
Given that the user taps "Generate invitation code"
When the invitation is created
Then the client must INSERT a row into wallet_invitations with wallet_id = active and created_by = auth.uid()
And the SELECT-after-insert must return the `code` column (16 hex characters, generated by the table default)
And on success the section must transition to the "code generated" view, which must contain:
  - A muted "SHARE THIS CODE" label (key "wallet.invitation.codeLabel")
  - An elevated Surface block containing the code (body variant, semibold, letter-spacing 1.5, tabular-nums)
  - A muted caption "Expires in 7 days · single use"
    (key: "wallet.invitation.codeExpiry" — en: "Expires in 7 days · single use" / pt-BR: "Expira em 7 dias · uso único")
  - A "Share code" pill (outlined in the positive/green color, positive-colored label, horizontal padding 20)
    (key: "wallet.invitation.shareCode" — en: "Share code" / pt-BR: "Compartilhar código")
  - A small text link "I have a code instead" (caption variant, muted) that opens the redeem modal
    (key: "wallet.invitation.haveCodeLink")
```

### Invitation section — Share code

```
Given that an invitation code has been generated and is displayed
When the user taps "Share code"
Then the native React Native Share API must be invoked with the code as the message body
  (await Share.share({ message: code }))
And the system share sheet must appear
And NO clipboard library must be referenced (zero native module dependency)
```

### Redeem code modal

```
Given that the user taps "I have a code" (or "I have a code instead")
When the RedeemCodeModal is opened
Then it must render as a bottom sheet using the same structure as EditDisplayNameModal:
  - transparent full-screen Modal with fade animation
  - semi-transparent backdrop (rgba 0,0,0,0.4) that dismisses on tap
  - sheet anchored to the bottom, top corners radius 20
  - title centered, key "wallet.invitation.redeemTitle"
    (en: "Enter invitation code" / pt-BR: "Inserir código de convite")
  - TextInput auto-focused on open, autoCapitalize "none", autoCorrect off
    placeholder from key "wallet.invitation.codeInputPlaceholder"
  - error state: a danger-colored caption with key "wallet.invitation.redeemError"
    visible only after a failed redemption attempt
  - two action buttons (row, 12-point gap):
      Cancel (flex: 1, outlined pill): key "wallet.invitation.redeemCancel"
      Join wallet (flex: 1, filled positive pill):
        idle:    key "wallet.invitation.redeemButton"  (en: "Join wallet" / pt-BR: "Entrar na carteira")
        pending: key "wallet.invitation.redeeming"     (en: "Joining…"    / pt-BR: "Entrando…")

Given that the user types a non-empty code and taps "Join wallet"
When the redeem action runs
Then it must call supabase.rpc('redeem_wallet_invitation', { p_code: code.trim().toLowerCase() })
And on success the returned wallet_id must be passed to useWallet().switchWallet(joinedWalletId)
And the TanStack Query cache for `wallet-members:<joinedWalletId>` must be invalidated
And the modal must close

Given that the RPC returns an error
When the error is received
Then the error caption must become visible inside the modal
And the modal must stay open so the user can correct the code
```

### "Wallets" section — structure

```
Given that the Account screen is rendered
When the Wallets section is displayed
Then a SectionHeader must appear above the row Surface with:
  - title from key "settings.sections.wallets" (en: "Wallets" / pt-BR: "Carteiras")
  - trailing: muted caption text showing "{wallets.length}/2"
And below it a bordered Surface must contain a single SettingsRow:
  - title from key "settings.walletsRow.title" (en: "My Wallets" / pt-BR: "Minhas Carteiras")
  - description: all wallet names joined by ", " (e.g. "Alemanha, Personal") — empty when wallets have not loaded
  - trailing: an ActionMenu (ellipsis dots) with the following items:
      For each wallet in the user's wallet list (sorted by joined_at ascending):
        - label: wallet name
        - systemImage: "checkmark" if this wallet is the active wallet, otherwise absent
        - action: if not the active wallet, calls switchWallet(id) and navigates to /(tabs)/(status)
                  if already active, action is a no-op
      Then a divider (dividerBefore: true) followed by:
        - label from key "wallets.createTitle" (en: "Create Wallet" / pt-BR: "Criar Carteira")
        - systemImage: "plus"
        - action: opens the WalletsModal in create mode (defaultView="create")
        - HIDDEN entirely when wallets.length >= 2 (free-tier limit reached)
```

### WalletsModal — create wallet view

```
Given that the user taps "Create Wallet" from the Wallets ActionMenu
When the WalletsModal opens
Then it must open directly in "create" view (defaultView="create"):
  - The name input must auto-focus 200 ms after the modal becomes visible
  - The modal header must show:
      left: pressable "← Back" (key: "common.back") that returns to list view
      center: title from key "wallets.createTitle"
      right: pressable "Done" (key: "common.done") that closes the modal
  - The body must show a create form containing:
      - label "NAME" (key: "wallets.nameLabel" uppercased) above a TextInput (maxLength 60, returnKeyType "done")
        placeholder from key "wallets.namePlaceholder"
      - label "CURRENCY" (key: "settings.currencyRow.title" uppercased) above a SortMenu currency picker
      - two action buttons (row, 12-point gap):
          Cancel (flex: 1, outlined pill): key "common.cancel"
          Create (flex: 1, green-background pill):
            idle:    key "common.create"
            pending: key "common.saving"
  - Create button must be disabled (opacity 0.4) when name is empty
  - The form must be in a ScrollView with keyboardShouldPersistTaps="handled"

Given that the user re-opens the WalletsModal after closing it
When visible transitions from false to true
Then the modal must reset to the defaultView passed at open time (not retain the last view from the previous open)

Given that the user submits a valid name
When the create mutation runs
Then it must call supabase.rpc('create_wallet', { p_name, p_currency })
And on success it must call useWallet().switchWallet(newWalletId) and return to the list view
And the TanStack Query cache key wallets:<userId>:list must be invalidated on success
```

### WalletsModal — list view

```
Given that the WalletsModal is opened without a defaultView (or defaultView="list")
When the modal is displayed
Then it must render as a bottom-sheet Modal (slide animation, transparent backdrop, top-radius 20)
And the header row must contain:
  - left: empty spacer (48 pt)
  - center: title from key "wallets.modalTitle"
  - right: pressable "Done" label (key: "common.done") that closes the modal
And the body must contain a ScrollView listing all wallets the user is a member of
And each wallet row (WalletItem) must show:
  - wallet name (body variant, semibold)
  - currency code and member count (caption variant, muted)
  - for the active wallet: a green "Active" badge
  - for inactive wallets: an ActionMenu (ellipsis dots) with a single "Switch" item
      (key: "wallets.switchButton", systemImage: "arrow.left.arrow.right")
      that calls switchWallet(id) and closes the modal
```

### "Display" section structure

```
Given that the Account screen is rendered
When the Display section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.display"
And the section must render a bordered Surface card containing its rows
And each row inside the section must use the SettingsRow molecule (title + optional description + trailing slot)
```

### "Show revenue" row

```
Given that the Display section is rendered
When the "Show revenue" row is displayed
Then it must show a title from key "settings.revenueVisible.title" (body variant, medium weight)
And it must show a description from key "settings.revenueVisible.description" (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "dashboard:revenue-visible"
And the default value (when no persisted state exists) must be false
```

### "Demo mode" row

```
Given that the Display section is rendered
When the "Demo mode" row is displayed
Then it must show a title from key "settings.demoMode.title" (body variant, medium weight)
And it must show a description from key "settings.demoMode.description" (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "settings:demo-mode"
And the default value (when no persisted state exists) must be false
```

### "Language & currency" section structure

```
Given that the Account screen is rendered
When the Language & currency section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.regional"
And the section must contain the Language row and the Currency row
```

### "Language" row

```
Given that the Language & currency section is rendered
When the language row is displayed
Then the title must come from key "settings.languageRow.title" (en: "Language" / pt-BR: "Idioma")
And the trailing slot must contain a SortMenu picker with options:
  1. "English" — value "en"
  2. "Portuguese (Brazil)" — value "pt-BR"
And selecting an option must call i18n.changeLanguage(value) and persist under "settings:language"
```

### "Currency" row

```
Given that the Language & currency section is rendered
When the currency row is displayed
Then the title must come from key "settings.currencyRow.title" (en: "Currency" / pt-BR: "Moeda")
And the trailing slot must contain a SortMenu picker:
  1. value "BRL" — en: "Brazilian Real (R$)" / pt-BR: "Real (R$)"
  2. value "USD" — en: "US Dollar ($)" / pt-BR: "Dólar (US$)"
  3. value "EUR" — en: "Euro (€)" / pt-BR: "Euro (€)"
And selecting an option must update the active wallet's currency column (wallets.currency) via Supabase
And NO value must be written to a "settings:currency" persisted-state key (currency is wallet-scoped)
And on success every monetary amount on screen must reformat (via the wallet context update + TanStack Query cache)
```

### Danger Zone — placement and structure

```
Given that the Account screen is rendered
When the bottom of the scroll content is reached
Then a Danger Zone block must be rendered below the Language & currency section
And the block must consist of:
  - a section label "DANGER ZONE" (key: "dangerZone.title" uppercased, caption variant, semibold, red/negative color)
  - a card (borderWidth hairline, borderColor negative + '44' transparency, borderRadius 16, overflow hidden)
    containing the Leave Wallet row (conditional) and the Delete Wallet area, separated by a hairline divider
And the card must never use a red background fill — the red is confined to borders, text, and badges
```

### Danger Zone — Leave Wallet

```
Given that the Danger Zone is rendered
When the current user's wallet membership and wallet count are evaluated
Then the Leave Wallet row must be SHOWN only when BOTH:
  - the active wallet has two members (the current user has a partner in this wallet), AND
  - the current user belongs to more than one wallet in total (useWalletList returns length > 1)
And the Leave Wallet row must be HIDDEN when either condition is false

When the Leave Wallet row is rendered
Then it must display:
  - title from key "dangerZone.leave.title"
  - description from key "dangerZone.leave.description"
  - trailing "Leave" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.leave.button")

Given that the user taps "Leave"
When the press is registered
Then a native Alert must appear with:
  - Title: key "wallet.leave.confirmTitle"
  - Body: key "wallet.leave.confirmBody"
  - Cancel button (style: "cancel"): key "wallet.leave.confirmCancel"
  - Leave button (style: "destructive"): key "wallet.leave.confirmLeave"
And on confirm the mutation must DELETE from wallet_members where wallet_id = active AND user_id = auth.uid()
And on success the TanStack Query cache wallets:<userId>:list must be invalidated
And then useWallet().refresh() must be called
  (the wallet resolver re-picks the next preferred wallet)
And on error a second Alert must appear with key "wallet.leave.errorToast"
```

### Danger Zone — Delete Wallet: no pending request

```
Given that the Danger Zone is rendered
And there is no pending wallet_delete_requests row for the active wallet
When the Delete Wallet row is displayed
Then it must show:
  - title from key "dangerZone.delete.title"
  - description:
      when the active wallet has 1 member: key "dangerZone.delete.soloDescription"
      when the active wallet has 2 members: key "dangerZone.delete.partnerDescription" with {{partner}} interpolated
  - trailing "Delete" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.delete.button")

Given that the user taps "Delete" on a solo wallet (1 member)
When the press is registered
Then a native Alert must appear with title "dangerZone.delete.soloTitle", body "dangerZone.delete.soloMessage"
And on confirm the mutation calls supabase.rpc('request_or_delete_wallet', { p_wallet_id })
And on success useWallet().refresh() is called and the TanStack Query cache wallets:<userId>:list is invalidated

Given that the user taps "Delete" on a 2-member wallet
When the press is registered
Then a native Alert must appear with title "dangerZone.delete.partnerTitle", body "dangerZone.delete.partnerMessage"
And on confirm the mutation calls request_or_delete_wallet which returns 'pending'
And the Danger Zone reactively transitions to the "waiting for partner" state
```

### Danger Zone — Delete Wallet: requester waiting for partner

```
Given that a wallet_delete_requests row exists for the active wallet
And requested_by = the current user's id

When the Delete Wallet area is displayed
Then it must show:
  - title alongside a "Pending" badge (key: "dangerZone.delete.waitingBadge")
  - caption from key "dangerZone.delete.waitingCaption" with {{partner}} interpolated
  - a pressable underlined "Cancel request" text link (key: "dangerZone.delete.cancelRequest")
And the "Delete" trailing button must NOT be shown

Given that the user taps "Cancel request"
Then it must call supabase.rpc('cancel_wallet_deletion', { p_wallet_id })
And on success the Danger Zone reactively reverts to the "no pending request" state
```

### Danger Zone — Delete Wallet: partner requested, awaiting current user's approval

```
Given that a wallet_delete_requests row exists for the active wallet
And requested_by ≠ the current user's id

When the Delete Wallet area is displayed
Then it must show a lightly red-tinted block with:
  - headline from key "dangerZone.delete.partnerRequestedTitle" (body, semibold, negative color)
  - caption from key "dangerZone.delete.partnerRequestedCaption"
  - full-width "Yes, delete the wallet" button (negative fill, white label)
    (key: "dangerZone.delete.approveAction")
  - full-width "Cancel request" button (surfaceMuted fill, muted label)
    (key: "dangerZone.delete.cancelRequest")

Given that the user taps "Yes, delete the wallet"
Then a native Alert must confirm before calling supabase.rpc('confirm_wallet_deletion', { p_wallet_id })
And on success useWallet().refresh() is called and cache is invalidated
```

### Danger Zone — reactive updates via realtime

```
Given that two users share a wallet and both have the Account screen visible
When User A triggers a deletion request
Then useWalletRealtime invalidates wallets:<userId>:list for both users
And both Danger Zones transition states without a manual refresh
And both transitions must occur within Supabase Realtime delivery latency (typically < 500 ms)
```

### Persistence

```
Given that the user toggles any toggle or picks a new value on this screen
When the change is committed
Then device-scoped preferences must be persisted to local storage immediately (expo-sqlite KV store)
And the storage keys owned by this screen are:
  - "dashboard:revenue-visible"   (boolean)
  - "settings:demo-mode"          (boolean)
  - "settings:language"           (supported language code: "en" or "pt-BR")
And currency selections must NOT be persisted to kv-store (written to wallets.currency)
And wallet selection is persisted under "wallet:selected-id:<userId>" by the wallet context
```

### Localization

```
Given that the active language is one of the supported languages ("en" or "pt-BR")
When the Account screen is rendered
Then every label and description must come from i18next under the keys listed in the scenarios above
And no string must be hardcoded in the screen source
And switching the language must update every label on the screen in place

Key namespaces used by this screen:
  - common.cancel / common.manage / common.back / common.done / common.loading / common.saving / common.create
  - settings.sections.account / settings.sections.wallets / settings.sections.display / settings.sections.regional
  - settings.walletsRow.title
  - wallets.modalTitle / wallets.createTitle / wallets.nameLabel / wallets.namePlaceholder
  - wallets.activeLabel / wallets.switchButton
  - wallets.membersOne / wallets.membersMany ({{count}})
  - wallet.invitation.sectionTitle / description / inviteButton / haveCodeButton
  - wallet.invitation.codeLabel / shareCode / codeExpiry / haveCodeLink
  - wallet.invitation.redeemTitle / codeInputPlaceholder / redeemButton / redeeming / redeemError / redeemCancel
  - profile.actions.editName / profile.actions.signOut
  - profile.editName.title / nameLabel / namePlaceholder / cancel / save / saving
  - dangerZone.title / leave.* / delete.*
  - wallet.leave.confirmTitle / confirmBody / confirmCancel / confirmLeave / errorToast
  - wallet.partner.unnamed
```

See the [Localization spec](localization.md) for the complete contract on language resolution, persistence, and cross-screen synchronization. See the [Data model spec](data-model.md) for the wallet currency contract and the delete-request RPC contracts.
