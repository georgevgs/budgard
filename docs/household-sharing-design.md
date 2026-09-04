# Household sharing (Pro)

Status: **implemented** on 2026-08-31.

## Product shape

- One Pro owner can invite one partner by email.
- The partner keeps a separate login and can switch between their own finances
  and the owner's shared financial space.
- Finance data is shared as one space: transactions and their receipt
  attachments, categories, tags, recurring items, templates, goals, debts,
  accounts and balances.
- Billing, subscription state, notification preferences, push subscriptions
  and security settings are always personal.
- Sharing stops immediately when revoked, when the partner leaves, or when the
  owner's Pro entitlement is no longer active.

## Data model

`household_shares` is an owner-scoped grant. Existing finance rows keep their
`user_id`; no data is copied or migrated into a household entity. The accepted
member writes the owner's id on new finance rows and `expenses.created_by`
records the actor.

One active/pending share per owner and one accepted incoming share per member
keep the v1 relationship intentionally small. Invite tokens are UUIDs; the
invite email must match the accepting account.

## Authorization

`private.can_access_financial_space(owner_id)` is the shared RLS predicate. It
returns true only for the owner or an accepted member whose owner still has
Pro. Every finance table uses that predicate for reads and writes, with
additional cross-space checks for foreign keys.

Receipt objects follow the same boundary. Their first Storage path segment is
the financial-space owner's UUID, and all four `storage.objects` policies call
`private.can_access_financial_space()` for that owner. A partner can therefore
open and maintain attachments in the shared space without gaining access to
any unrelated user's folder.

The authenticated role cannot mutate `household_shares` directly. Invite,
accept, revoke and leave transitions go through narrow RPCs that enforce the
seat limit, email match and actor role. Notification settings were split into
`user_notification_settings` so household access never exposes or changes a
partner's personal notification choices.

## Client flow

`FinancialSpaceProvider` sits above `DataProvider`. Selecting a space remounts
the data provider and changes the explicit owner filter used by every service.
The local snapshot and offline transaction queue use `userId:ownerId` keys so
data from two spaces cannot mix on-device.

The profile menu owns the switcher. Settings owns invite/revoke/leave. A
`/join?token=…` link survives sign-in and accepts only after authentication.

## Deliberate v1 limits

- One partner, equal edit access, no viewer role.
- No per-feature sharing or private transactions inside a shared space.
- Invitation links can be copied; transactional invite email delivery is not
  configured yet.
- Partner push notifications remain personal and are not generated from the
  owner's notification settings.
