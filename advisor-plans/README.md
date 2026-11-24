# Budgard enhancement audit

Audited `main` at `a041746` on 2026-11-24. Start with the loan calculation and CSV re-import fixes. They change figures and transaction types users already rely on. Five plans were selected for impact, confidence and a clear regression test. All are independent. The evidence links describe the audited baseline.

## Recommended order

| Plan | Change | User impact | Effort | Fix risk | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [001](001-correct-partial-loan-projections.md) | Correct the balance after partial loan payments | Today and Forecast can understate the cash still due. A €120 balance can show €70 due. | S | Medium | [Current-month cap](../src/constants/debtOutflow.ts#L191), [forecast balance](../src/constants/debtOutflow.ts#L211). Reproduced. | Implemented |
| [002](002-preserve-transaction-types-in-csv.md) | Read the Type column when importing Budgard's own exports | Refunds can be recorded as income or skipped. An income-only file can be imported entirely as expenses. | M | Medium | [Exported types and amounts](../src/constants/csvExport.ts#L144), [import sign inference](../src/common/components/csvImport/hooks/useCsvImportFlow.ts#L227). Reproduced. | Implemented |
| [003](003-open-the-personal-ledger-offline.md) | Let the personal ledger open while household data is unavailable | A returning user with a valid cached personal ledger can get a blocking error instead of seeing their records. | M | Medium | [Provider gate](../src/common/contexts/AuthenticatedProviders.tsx#L33), [share lookup](../src/common/contexts/FinancialSpaceProvider.tsx#L110). Source trace. | Implemented |
| [004](004-wait-for-complete-annual-exports.md) | Withhold annual CSV and PDF until history is complete | A previous year's download can omit months while older transactions load or after the request fails. | S–M | Low | [Export section](../src/pages/settings/components/AnnualExportSection.tsx#L17), [history failure flags](../src/common/hooks/data/dataHistory.ts#L60). Source trace. | Implemented |
| [005](005-load-the-complete-review-queue.md) | Fetch pending imports independently of transaction history | An older statement can disappear from Review after relaunch while the imported rows are still pending. | M | Medium | [Review selection](../src/common/hooks/dataOps/useTransactionReviewOps.ts#L14), [Activity badge](../src/pages/activity/components/ReviewQueueBanner.tsx#L7). Source trace. | Implemented |

S is hours and M is roughly a day before review. Run each plan's drift and verification checks before updating its status. Leave implementation work uncommitted.

## Implementation batches

1. Fixed partial loan projections and preserved transaction types on CSV re-import. Added English and Greek round-trip coverage and checked the expense and income payloads through the import flow.
2. Restored cached personal-ledger launch during household service failures and gated annual downloads on successful history loading. Added retry and reconnect coverage.
3. Loaded older imports through the owner-scoped Review query. Verified the Activity count after returning from Review, plus tied-date pagination and retry.

The implementation passed 2,020 unit tests and seven Chromium tests covering offline launch, replay, and statement import and review.

## Further findings

| Finding | User impact and next change | Effort / fix risk | Evidence |
| --- | --- | --- | --- |
| Preserve edits made during offline replay | Replay deletes a queued create using the ID it read before sending the request. An edit can be merged into that same entry during the request and then be lost, or a delete can be canceled locally while the create still lands. Claim entries atomically and retain dependent operations after a create has been claimed. The newer client UUIDs already make retries of the create idempotent. | M / Medium | [Replay acknowledgment](../src/common/hooks/useOfflineSync.ts#L112), [queue reconciliation](../src/constants/offlineQueue.ts#L267), [idempotent creation](../src/pages/expenses/expensesApi.ts#L88). Source trace. |
| Reapply pending work after relaunch | Boot hydrates a trimmed, debounced snapshot. A queued change can disappear, revert, or reappear in the wrong state if that snapshot predates it. Use queue operations as the durable overlay for the active actor and owner. Plan after 003 so a relaunch regression can verify both behaviors. | M / Medium | [Snapshot hydration](../src/common/hooks/data/useDataLayer.ts#L46), [snapshot trim](../src/constants/dataCache.ts#L140), [current merge](../src/common/contexts/dataContextHelpers.ts#L34). Source trace. |
| Infer statement date order once per file | CSV and QIF can interpret `03/14/2026` as March 14 and `03/04/2026` as April 3 in the same file. Infer one order from reliable rows and offer a choice when dates are ambiguous. | M / Medium | [CSV date parsing](../src/common/components/csvImport/utils/csvValues.ts#L41), [QIF date parsing](../src/common/components/csvImport/utils/statementImport.ts#L217). Reproduced. |
| Save a transaction rule and its effects together | Teaching a rule inserts it, applies it to history, and marks the source reviewed in separate requests. A later failure can leave an active rule while the unique matcher blocks the exact retry. Make the action atomic and give retries a stable identity under existing RLS. | M / Medium | [Insert and apply](../src/common/api/transactionRuleService.ts#L23), [review action](../src/common/hooks/dataOps/useTransactionReviewOps.ts#L55), [unique matcher](../supabase/migrations/20260831161403_add_transaction_review_and_rules.sql#L25). Source trace. |
| Show cash flow for income-only ledgers | Pro Trends exits early on an empty expense list. Income can be present while cash flow and Forecast sit behind a first-expense prompt. Derive section readiness and year choices from the relevant transactions. | M / Low–medium | [Trends overview](../src/pages/analytics/AnalyticsView.tsx#L59), [deep dive](../src/pages/analytics/TrendsDeepDiveView.tsx#L54), [year list](../src/pages/analytics/hooks/useAnalyticsData.ts#L86). Source trace. |
| Make Money Flow percentages comparable | Savings is a share of income and a category is a share of spending. A €400 branch on €1,000 income can show 100% beside 60% savings. Match the chart's scale or label each denominator and include savings in the accessible summary. | S / Low | [Branch labels](../src/pages/analytics/components/MoneyFlowPanel.tsx#L105), [chart summary](../src/pages/analytics/components/MoneyFlowPanel.tsx#L215). Source trace. |
| Correct the documented history refresh behavior | The architecture guide says routine refresh includes previously loaded history. The current implementation intentionally re-fetches the recent window and retains the older tail unless the user manually refreshes. Update the two conflicting descriptions when touching history docs. | S / Low | [Architecture guide](../docs/architecture.md#L145), [refresh bounds](../src/common/hooks/data/dataFetch.ts#L45). Source trace. |

## Product opportunities

- **Make import flow directly into Review.** Offer a visible link after a successful import and use the existing transaction editor for one-off corrections from Review. Keep “Teach a rule” for changes intended to affect future or matching past transactions. This builds on 005. [Import completion](../src/common/components/csvImport/hooks/useCsvImportFlow.ts#L127), [review actions](../src/pages/review/ReviewQueueView.tsx#L165).
- **Help users detect overlapping statements.** Capture the existing OFX/QFX transaction identifier when an account can be reliably identified. Show possible matches for CSV and QIF for confirmation so identical legitimate purchases remain valid. This protects re-imports across separate sessions. [OFX fixture](../src/common/components/csvImport/utils/__tests__/statementImport.test.ts#L14), [parser](../src/common/components/csvImport/utils/statementImport.ts#L65).
- **Add a self-contained recovery view for pending offline changes.** Surface items needing attention and explain which changes will sync. Today the UI exposes an aggregate count and replay can ultimately drop a failed entry. Design this after replay and relaunch handling are reliable. [Pending banner](../src/common/components/common/OfflineBanner.tsx#L7), [retry cap](../src/common/hooks/useOfflineSync.ts#L129).

## Verification and coverage

- Passed 2,005 Vitest tests across 236 files, 17 backup tests, and six dependency-audit tests. Typecheck, ESLint, Prettier, production reachability, and API usage checks passed.
- Production-mode build from an isolated source copy passed all bundle budgets. Landing startup measured 283.7 kB gzip against a 285 kB threshold. Authenticated startup measured 366.7 kB against 375 kB. Precache measured 552.7 kB against 565 kB. These are build measurements.
- Frozen dependency checks passed for all six Edge Functions. The registry audit reported zero blocking frontend advisories and no known advisory in the six Edge Function graphs. It reported three frontend tooling advisories.
- The audit traced daily budgeting and loans, History, CSV imports and exports, Review, offline launch and replay, plus a sample of billing and backend boundaries. Browser journeys, real-device iOS behavior, local SQL integration suites, and production data and configuration remain unverified.

## Considered trade-offs

- Expanding offline writes to other domains is outside scope. The app's documented queue and replay contract covers expenses and incomes.
- The billing and household behavior stays within the existing one-partner model. Bank connectivity needs a configured provider, and the existing statement-import flow gives a grounded path to improve today.
- The PDF engine and fonts contribute about 739 KiB of compressed assets on first use, but they are already lazy-loaded and cached after use. Startup headroom and the report correctness fix have higher priority than replacing the PDF stack.
