# Household sharing (Pro) — design

Status: **design only, not implemented**. Written 2026-07-27.

## Why

Partner/household budgeting is the single biggest pay-driver in the category:
YNAB ships 6 seats per subscription, Monarch gives partners free seats and
calls it their moat, and Emma/Spendee/Buddy all reserve multi-user for their
top tier. For Budgard it is also the only feature big enough to justify a
future price raise for new users.

## Product shape (v1)

- A Pro **owner** invites exactly **one partner** by email. The partner can be
  a free user (the seat rides on the owner's Pro, like Monarch).
- The partner gets a **space switcher** (own budget ⇄ shared budget). Inside
  the shared space the app operates entirely on the owner's data: expenses,
  income, categories, tags, budgets, recurring, goals, debts, net worth.
- Everything in the shared space is shared (YNAB model). No per-feature
  opt-outs in v1 — that's a Phase 2 decision if users ask.
- Attribution: new rows record who logged them (`created_by`), shown as a
  small avatar/initial on rows (Monarch's "Recent Moves" pattern).
- Not shared, ever: notification preferences, push subscriptions,
  subscriptions/billing, checkout rate-limit rows.

## Data model — owner-scoped sharing (Option B)

Data stays owned by the owner; nothing is migrated. Sharing is a grant table:

```sql
CREATE TABLE budget_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_email TEXT NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (owner_id)          -- v1: one partner per owner
);
```

Rejected alternative: a `households` entity with `household_id` stamped on
every table. It is the "clean" model but forces a migration of all 12 data
tables and every RLS policy in one shot, plus backfill. Option B touches
policies only, keeps `user_id` semantics, and can be reverted.

## RLS pattern

One SECURITY DEFINER helper, used by every shared table's policies:

```sql
-- STABLE + initplan-friendly: call as (SELECT can_access_budget(user_id))
CREATE FUNCTION can_access_budget(row_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT row_owner = auth.uid()
     OR EXISTS (
        SELECT 1 FROM budget_shares
        WHERE owner_id = row_owner
          AND member_id = auth.uid()
          AND status = 'accepted')
$$;
```

Each shared table (expenses, expense_tags, categories, tags,
recurring_expenses, user_budgets, category_budgets, goals, debts,
debt-related tables, accounts, account_balances, expense_templates):

- SELECT/UPDATE/DELETE `USING ((SELECT can_access_budget(user_id)))`
- INSERT `WITH CHECK ((SELECT can_access_budget(user_id)))` — the partner
  inserts rows with `user_id = owner_id` (client sets it explicitly in shared
  mode; the `DEFAULT auth.uid()` stays for own-space writes).
- Add `created_by UUID DEFAULT auth.uid()` to `expenses` (v1: only there).
- Storage (receipts): mirror the same check in the storage policies.
- Perf: keep the `(SELECT ...)` initplan form (same reasoning as migration
  20260425000000); index `budget_shares(member_id, status)`.

The free-tier caps' triggers count rows per `user_id`, so shared-space writes
count against the **owner's** caps — correct, since the owner is Pro.

## Invite flow

1. Owner (Pro-gated UI in Settings) enters partner email → edge function
   `share-invite` creates the row, emails a link
   `budgard.com/join?token=…` (Cloudflare Email Routing/worker or Resend —
   decide; support@budgard.com forwarding is already pending).
2. Partner signs in/up, opens the link → edge function `share-accept`
   validates token + email match, sets `member_id`, `status = 'accepted'`.
3. Either side can revoke in Settings (`status = 'revoked'`); revocation is
   instant via RLS.
4. Owner's Pro lapses → shared reads keep working through the status grace
   window already encoded in `isSubscriptionPro`; a daily cron (or the
   webhook) flips shares to `revoked` when the subscription goes terminal.

## Client architecture

- `SpaceContext` above `DataContext`: `{ activeSpace: 'own' | ownerId }`,
  persisted per-device (localStorage). The switcher lives in AppMenu.
- `dataService` gets the active owner id injected once (module-level setter,
  same pattern as the auth client): reads add `.eq('user_id', owner)` where
  needed (most tables already filter implicitly via RLS; explicit filter
  keeps caches clean), writes stamp `user_id: owner`.
- Caches: key the localStorage snapshot and offline queue by
  `userId:spaceId`; bump CACHE_VERSION.
- Realtime/refresh: the existing visibilitychange refetch covers v1; live
  presence is out of scope.
- Push notifications: v1 fires only for the owner's own devices (cron
  functions already key on user_id; partners' devices see data on open).

## Effort and phasing

| Phase | Scope | Estimate |
|---|---|---|
| 1 | budget_shares + RLS helper + policies on expenses/categories/tags/budgets + created_by + invite/accept functions + space switcher + shared expense entry | the bulk — DB ~2 days, client ~3-4 days, QA on RLS ~1 day |
| 2 | goals/debts/networth tables in shared space; partner push notifications | +2-3 days |
| 3 | >1 seat, roles (viewer/editor), per-feature sharing | only if demanded |

## Open decisions for George

1. Email delivery for invites (Cloudflare Worker + Email Routing vs Resend
   free tier) — nothing is set up today.
2. Does the partner's shared-space activity appear in the owner's weekly
   recap/notifications (v1: yes, it's the same data)?
3. Marketing: "Share with your partner" becomes the headline Pro feature and
   the basis for a future price point for new users (~€2.99/€29.99),
   grandfathering existing subscribers.
