# 002 · Preserve transaction types when re-importing Budgard CSVs

| Priority | Effort | Risk | Category | Depends on | Planned at |
| --- | --- | --- | --- | --- | --- |
| P1 | M | Medium | Correctness | None | `a041746`, 2026-11-24 |

```sh
git diff --stat a041746 -- src/common/components/csvImport src/constants/csvExport.ts src/locales/en/translation.json src/locales/el/translation.json
```

Recheck the evidence below against any changed files before editing.

## User outcome

Activity and annual transaction CSVs re-import a positive charge as an expense, a refund as a negative expense, and a paycheck as income. English and Greek files work regardless of the active app language. The existing income-skip choice applies to actual income rows.

## Current behavior

- `src/constants/csvExport.ts:39` emits six headers including localized Type. At line 167, it outputs the signed ledger amount. Charges go out with a negative sign and refunds with a positive sign. Income keeps its amount.
- `src/common/components/csvImport/utils/csvColumns.ts:28` recognizes `type` as a potential category header. `useCsvImportFlow.ts:227` chooses bank sign handling when the mapped amount column has a negative cell. `utils/csvValues.ts:163` then classifies amounts from their signs.
- A synthetic export of a €40 charge, €10 refund and €100 paycheck produces three parser rows, with the refund classified as €10 income. An export containing only the paycheck is parsed as an expense. With the default skip-income setting, a refund misclassified as income can be silently dropped.
- Current localized headers and type labels are in `src/locales/en/translation.json` and `src/locales/el/translation.json` under `annualExport.csv`. The Greek headers have accents and the generic matcher currently uses unaccented keywords.

## Scope and conventions

Edit the CSV import module only, primarily `utils/csvColumns.ts`, `utils/csvImport.ts`, `utils/csvTypes.ts`, `hooks/useCsvImportFlow.ts`, and their existing unit tests. Use `utils/csvText.ts`, `utils/importReducer.ts`, and both locale files if needed to carry detection, initial defaults, or row feedback. Leave exporter behavior and spreadsheet formula defusing in place. Keep the OFX, QFX, and QIF paths, general bank CSV behavior, category rules, and the existing import/Review write path. CSV cannot reconstruct an attachment, linked debt, or original recurring relationship. Follow the house rules for explicit checks, named helpers, and immutable state. Route UI text through `t()`.

## Implementation

1. In `utils/__tests__/csvImport.test.ts`, write regression fixtures with `buildTransactionsCsv` and real English/Greek translations. Go through preview, suggested mapping, and parser as the hook does. Assert an expense of 40, an expense refund of -10, and income of 100. Test income-only and refund-only files. Run `bun run test src/common/components/csvImport/utils/__tests__/csvImport.test.ts` and observe failures against today's code.
2. Identify Budgard files from the known transaction header layout, in either supported export language, using accent-safe comparison. Use the resolved Type column for native rows. Decode the signed ledger amount with the existing numeric parsing and validation, then store the correct internal sign for the explicit type. Route blank or unknown Type values through an explicit row error so an edited native file cannot silently become another kind. Preserve the selected income-skip behavior. Include income by default for native exports so a paycheck-only file reaches a usable preview. Keep the existing default for generic CSVs and retain the option to skip income during mapping.
3. Keep the existing bank heuristic for other layouts. Add cases for a bank-provided unrelated Type column, mapped amounts, skip-income on and off, BOM or whitespace before the headers, and valid mixed native rows from either locale. Extend `hooks/__tests__/useCsvImportFlow.test.ts` to verify the native branch passes expense and income payloads to the existing operations. Run `bun run test src/common/components/csvImport src/constants/__tests__/csvExport.test.ts` and expect all tests to pass.

## Verification and boundaries

Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format:check`, and `~/.agents/house-style/bin/house-lint`. Expect all to pass. Run style-check, confirm the working diff is scoped, leave it uncommitted, and update the index.

Stop and report if normalizing the explicit type would change a generic CSV or statement fixture that the current suite treats as supported. File-level date inference and deduplication are separate changes.
