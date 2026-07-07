# Smoke test checklist: invite / leave / delete wallet flows

Two accounts needed: **A** = inviter/owner, **B** = invitee/partner (different
verified emails). Matching is by `auth.email()`, so B doesn't need an account
when the invite is sent — the banner appears once B signs in with that email.
Run both side by side to also verify realtime.

Limits (`free_tier_limits()`): **3 wallets/user**, **3 pending invites/wallet**.

Expected UI text is quoted from `i18n/locales/en.json`. Error names in
`code font` are the raw RPC `raise exception` strings (not user-visible).

---

## 1. Invitation — happy path

- [ ] A: open invite modal → header **"Share with someone"**, field **"Email"**.
- [ ] A: enter B's email, tap **"Send invite"**.
- [ ] Toast: **"Invitation sent to {email}!"**, modal closes.
- [ ] A settings: invite shows under outgoing as **pending**.
- [ ] B: sign in → banner **"You're invited"**, body **"{A} invited you to share "{wallet}"."**
- [ ] B: tap **"Join"** → toast **"You joined {wallet}!"**, switched into shared wallet, banner gone.
- [ ] A (realtime): B appears as member; outgoing pending row clears (accept deletes the invite).

## 2. Invitation — decline

- [ ] A invites B (pending).
- [ ] B: tap **"Decline"** → toast **"Invitation declined"**, banner gone.
- [ ] A: invite row stays but flips to **declined** (soft decline).
- [ ] A: dismiss the declined invite → row disappears.

## 3. Invitation — inviter cancels a pending invite

- [ ] A invites B; B does not respond.
- [ ] A: cancel the pending outgoing invite.
- [ ] B: open/refresh app → banner is **gone** (invite row deleted).

## 4. Invitation — re-invite refreshes

- [ ] A invites B; B declines (declined row on A's side).
- [ ] A: invite B **again**, same email.
- [ ] Prior row deleted, fresh **pending** created — no duplicate, no error, same success toast.

## 5. Invitation — validation / business errors (inline on invite screen)

Each shows an inline error under the field, no crash:

- [ ] Empty / whitespace email → **"Send invite"** stays disabled.
- [ ] Malformed (`foo`, `foo@bar`) → **"That doesn't look like an email. Give it another try."** — `invalid email`
- [ ] Own email → **"That's your own email — invite someone else."** — `cannot invite self`
- [ ] Email already a member → **"They're already in this wallet."** — `already a member`
- [ ] 4th pending invite (limit 3) → **"You've reached the 3-invite limit for this wallet."** — `free_tier_limit`
- [ ] Offline (airplane mode) → **"No connection! Check your Wi-Fi and try again."**

## 6. Invitation — expiry edge

- [ ] A invites B; B waits past `expires_at`.
- [ ] B: banner does **not** show (expired invites filtered from `list_pending_invitations`).
- [ ] If B accepts an expired invite → RPC deletes it, errors `invitation expired`; UI shows **"Something went wrong. Give it another try."**, banner clears.

---

## 7. Leave wallet

Row only renders when: has a partner **and** you have another wallet
(`hasPartner && wallets.length > 1`). Title **"Leave wallet"**, subtitle
**"Remove yourself. The other person keeps all data."**

- [ ] A + B share a wallet; ensure B also has a second personal wallet.
- [ ] B: shared wallet Danger Zone shows the **"Leave"** row.
- [ ] B: tap **"Leave"** → dialog **"Leave wallet?"** / **"The other person will keep access. You'll start a new personal wallet."**
- [ ] B: confirm **"Leave"** → removed from `wallet_members`, list refreshes, switched off shared wallet.
- [ ] B: **lands on the Overview screen** with top notification **"You are now in {WalletName}"** (see gap note under flow 8 — same limitation applies here).
- [ ] A (realtime): B disappears from members; wallet is solo again.
- [ ] On error: toast **"Something went wrong. Give it another try."**
- [ ] **Negative:** solo wallet → no Leave row. Shared wallet that is your _only_ wallet → no Leave row.

---

## 8. Delete wallet — solo (immediate)

Subtitle **"Permanently deletes all wallet data."**

- [ ] A: solo wallet that is **not** your last wallet → tap **"Delete"**.
- [ ] Dialog **"Delete Wallet?"** / **"This will permanently delete the wallet and all its data. This cannot be undone."** → **"Delete"**.
- [ ] Wallet hard-deleted immediately (RPC `deleted`), list refreshes, switched to another wallet.
- [ ] **Lands on the Overview screen** (not left on Settings/Danger Zone).
- [ ] **Top notification** shows **"You are now in {WalletName}"** naming the fallback wallet switched into.
- [ ] **Negative — last wallet:** Delete button **disabled**, subtitle **"At least 1 wallet is required. Create another before you can delete this one."**

> ✅ **Implemented — applies to flows 7, 8, and 9:** every "active wallet changed
> under you" path (`useRequestOrDeleteWallet` solo delete, `useLeaveWallet`,
> `useConfirmWalletDeletion`) now calls `refresh({ announce: true })`. When the
> re-resolve lands on a different wallet, the app navigates to Overview
> (`ROUTES.home`) and shows the toast **"You are now in "{WalletName}""**
> (`wallet.switchedToast`). Expect this on the **acting** device.
>
> ✅ **Also covered — the other device (realtime):** when one member approves a
> deletion, the _other_ member's device is moved off the deleted wallet by
> `useActiveWalletReconciler`: once the wallet drops out of the settled
> membership list, it re-resolves to a valid wallet, navigates to Overview, and
> shows the **"You are now in "{WalletName}""** toast. This fixes the stale-content
> bug where the switcher showed a new wallet but the screen content stayed bound
> to the deleted wallet's id.

## 9. Delete wallet — shared (two-step approval)

Subtitle **"Needs {partner}'s approval before deleting."**

- [ ] A + B share a wallet. A: tap **"Delete"**.
- [ ] Dialog **"Request Deletion?"** / **"{B} will receive a deletion request and must approve it before anything is deleted."** → **"Send request"**.
- [ ] RPC returns `pending`. A sees **"Pending"** badge + caption **"Waiting for {B} to approve. You can cancel at any time."** No deletion yet.
- [ ] B (realtime): a **red banner** appears at the top of **Overview** (not in Settings), like the invite banner. Title **"Deletion requested"**, body **"{A} wants to delete "{wallet}". Approving erases all its data for both of you and can't be undone."**, with **Approve** / **Cancel**.
- [ ] Banner is **cross-wallet**: it shows even while B is viewing a different wallet, and names the wallet in question.
- [ ] B: tap **Approve** → confirm dialog **"Approve Deletion?"** / **"…for both of you. This cannot be undone."** → **"Yes, delete the wallet"**. On success, toast **""{wallet}" deleted"**.
- [ ] B: tapping **Cancel** on the banner dismisses the request → toast **"Deletion cancelled"** (this is flow 11).
- [ ] B: tap approve → dialog **"Approve Deletion?"** / **"This will permanently delete the wallet and all its data for both of you. This cannot be undone."** → **"Yes, delete the wallet"**.
- [ ] Wallet hard-deleted, both members switched off it.
- [ ] Approver (B): **lands on the Overview screen** with top notification **"You are now in {WalletName}"**.
- [ ] Requester (A, realtime): also switched off it → **lands on Overview** with the same **"You are now in {WalletName}"** notification (see gap note under flow 8).

## 10. Delete wallet — requester cancels

- [ ] From 9 (A waiting): A taps **"Cancel request"** → request removed, Delete row back to normal.
- [ ] B: "partner requested" prompt disappears (realtime).

## 11. Delete wallet — partner cancels

- [ ] From 9 (B sees request): B taps **"Cancel"** → request removed for both.
- [ ] A: "Pending" badge clears (realtime).

## 12. Delete wallet — guard rails (RPC-level backstops)

- [ ] Requester approves own request → `cannot_confirm_own_request` (A only sees "cancel", so this is a backstop).
- [ ] Same user re-requests → idempotent, returns `pending`, no duplicate row.
- [ ] Both request: A requests, then B tries to Delete instead of approving → `delete_already_requested`.
- [ ] Cancel with no pending request → `no_pending_delete_request`.

---

## Cross-cutting checks

- [ ] **Realtime:** accept / leave / request / cancel / delete reflect on the other device without manual refresh (`wallet_members`, `wallet_invitations`, `wallet_delete_requests` are all published).
- [ ] **Invalidation:** wallet list, member list, invite lists stay correct without a restart.
- [ ] **No double toasts:** invite and leave suppress the global mutation toast and surface their own — verify errors aren't shown twice.
- [ ] **Auth loss mid-flow:** act while signed out / expired session → graceful error, no crash.
