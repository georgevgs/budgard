# 001 · Correct partial loan projections

| Priority | Effort | Risk | Category | Depends on | Planned at |
| --- | --- | --- | --- | --- | --- |
| P1 | S | Medium | Correctness | None | `a041746`, 2026-11-24 |

Run the drift check first. Compare changed paths against the evidence below before editing.

```sh
git diff --stat a041746 -- src/constants/debtOutflow.ts src/constants/__tests__/debtOutflow.test.ts
```

## User outcome

Today, Plan and Forecast agree on the remaining amount due for each tracked loan. Forecast subtracts exactly that remaining payment from the balance it carries into the following month.

## Current behavior

- `src/constants/debtOutflow.ts:126` computes dated loan obligations for monthly budget and Plan through `remainingMinimum`. `projectLoanOutflow` at line 147 supplies the current and subsequent months to Forecast.
- `remainingMinimum` at line 191 first caps a full installment by the projected outstanding balance, then subtracts payments already reflected in that balance. On a zero-APR loan with a €400 minimum, €50 already paid and €120 outstanding, the result is €70 due. €120 is still due.
- `scheduleMinimums` at line 211 starts from `debt.current_balance` and applies a full installment again during a partially paid month. With €600 outstanding and the same minimum and prior payment, Forecast correctly displays €350 this month but carries only €200 into next month. The balance after the €350 payment is €250.

## Scope and conventions

Edit `src/constants/debtOutflow.ts` and `src/constants/__tests__/debtOutflow.test.ts`. Keep public shapes, existing `roundMoney` usage, the established interest convention, due-day clamping, and the rules for credit cards, currencies, completed loans, and loans with no tracker payment. Keep calculations out of components. Follow `~/.agents/AGENTS.md` for Yoda checks, explicit null handling, and avoiding ternaries, optional chaining, and mutable local variables.

## Implementation

1. Extend the existing loan tests with the €120 case for both `collectLoanMinimumsDue` and `projectLoanOutflow`, plus the €600 case asserting `restOfMonth === 350` and `months[0] === 250`. In both fixtures use the existing August test date, a tracked loan, a €50 August payment, a €400 minimum, and zero APR. Run `bun run test src/constants/__tests__/debtOutflow.test.ts` and observe the target failures.
2. Compute the unpaid contractual installment from the minimum and payments this month. Cap that unpaid amount by the projected balance at the current-month step. Share the amount between the dated obligation and the forecast walk. Preserve the existing behavior of skipping the current-month step when the installment is already covered. Run the narrow suite again and expect all cases to pass.
3. Check that the remaining 12-month array still zero-fills after payoff, and that the existing APR and fully paid cases pass. Use the existing test fixtures and avoid changing callers to compensate for arithmetic.

## Verification and boundaries

Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format:check`, and `~/.agents/house-style/bin/house-lint`. Expect all to pass. Run the style-check skill and inspect `git status --short` for scope. Leave work uncommitted and update the plan index.

Stop and report if the debt balance contract has changed since the audit or fixing it requires touching server amortization, recorded transactions, or push reminders.
