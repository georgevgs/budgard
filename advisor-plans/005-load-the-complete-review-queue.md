# 005 · Include older imports in Review

| Priority | Effort | Risk | Category | Depends on | Planned at |
| --- | --- | --- | --- | --- | --- |
| P1 | M | Medium | Correctness and performance | None | `a041746`, 2026-11-24 |

```sh
git diff --stat a041746 -- src/pages/review src/pages/activity/ActivityView.tsx src/pages/activity/components/ReviewQueueBanner.tsx src/common/hooks/dataOps/useTransactionReviewOps.ts src/common/api src/locales e2e/statement-import.spec.ts e2e/fixtures
```

Compare changed paths with the evidence below before editing.

## User outcome

A backdated imported expense or income still appears in the Review count and queue after reloading. The Activity link reports the real count for the selected ledger. Review confirms an empty queue only after a successful fetch.

## Current behavior

- `src/common/hooks/dataOps/useTransactionReviewOps.ts:14` filters the expense and income arrays already held in DataProvider for pending transactions. `src/pages/activity/components/ReviewQueueBanner.tsx:7` counts the same arrays and hides the link when they contain no pending rows.
- `src/pages/activity/ActivityView.tsx:52` loads history on qualifying searches and periods or if the recent feed is empty. `src/common/hooks/data/dataHistory.ts:45` fetches the tail older than the rolling cutoff. When a recent manual entry exists, a normal Activity visit can omit pending records from earlier years. Direct `/review` can display its empty state at `src/pages/review/ReviewQueueView.tsx:90` for the same ledger.
- Both expenses and incomes share `public.expenses`. `supabase/migrations/20260831161403_add_transaction_review_and_rules.sql:94` indexes owner, review status, date and creation time. `src/common/api/dataAccess.ts:42` has a transaction cursor with ID as the final tie-breaker.
- `src/common/api/transactionRuleService.ts:54` scopes mark-reviewed writes to the active owner. `useTransactionReviewOps.ts:39` owns optimistic removal from the provider and rollback through `useMutationRunner`.

## Scope and conventions

Add `src/pages/review/reviewApi.ts` and a route-owned query hook under `src/pages/review/hooks/`. Compose the API in `src/common/api/dataService.ts`. Wire `ReviewQueueView.tsx`, `ReviewQueueBanner.tsx`, the banner placement in `ActivityView.tsx` if needed for empty and error branches, and `useTransactionReviewOps.ts`. Include tests next to the query and in `e2e/statement-import.spec.ts`, with the relevant fixture and two locale files as needed. Keep writes in the operation hook and keep reads owner-scoped under RLS. Name explicit foreign keys for every new embed and reuse keyset pagination. Keep the existing sheet, row actions and styling conventions. Read `ui-flows` and the palette before changing the UI.

## Implementation

1. Add a browser fixture with a recent reviewed row and a pending imported row dated before the rolling cutoff. Open Activity after a fresh navigation and assert the count and link. Open Review and assert the older row, mark it reviewed, and check that the count and queue converge. Extend the mock so it respects owner, pending status and pagination. Run `bun run test:e2e -- e2e/statement-import.spec.ts` and observe the baseline failing before changing app behavior.
2. Add an abortable, counted pending read scoped by owner and status. Use a count-only read on Activity and page-size reads in Review, ordered by `date`, `created_at`, and `id`, with the existing keyset helper. Include the fields used by row display and rule teaching, with any required embeds named by FK. Model loading, error and ready as separate states. Verify a synthetic page boundary where date and creation time match and only ID differs.
3. Have the route consume server-backed pending rows while `useTransactionReviewOps` keeps ownership of writes. Reconcile the query immediately after successful bulk or per-row review and rule teaching. Apply any optimistic status to both surfaces with rollback for failures, or keep server-backed rows visible and show progress until confirmation. When fetch or owner changes, abort earlier reads and reset selected IDs so an old response cannot populate a different ledger. Label select-all as applying to loaded rows if pagination is visible. Return cleared rows to an appropriate empty state after server confirmation.
4. Exercise a pending income and expense, several pages, an error with retry, an actor/owner transition, and the zero count after review. Keep Activity's general transaction history lazy. Run `bun run test src/pages/review src/pages/activity src/common/hooks/dataOps` and `bun run test:e2e -- e2e/statement-import.spec.ts` and expect all checks to pass.

## Verification and boundaries

Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format:check`, and `~/.agents/house-style/bin/house-lint`. Expect all to pass. Run style-check, inspect the diff, leave work uncommitted, and update the index.

Stop if the existing authenticated read policy cannot supply a pending row for an authorized owner/partner. Keep schema, access policies, report history loading, and transaction rule semantics outside this patch. Review entry after import can build on this query in a follow-up.
