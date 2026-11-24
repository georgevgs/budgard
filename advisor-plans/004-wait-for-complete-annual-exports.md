# 004 · Wait for complete history before exporting a year

| Priority | Effort | Risk | Category | Depends on | Planned at |
| --- | --- | --- | --- | --- | --- |
| P1 | S–M | Low | Correctness | None | `a041746`, 2026-11-24 |

```sh
git diff --stat a041746 -- src/pages/settings/components/AnnualExportSection.tsx src/pages/settings/components/AnnualExportCard.tsx src/pages/settings/components/__tests__ src/common/hooks/data/dataHistory.ts src/locales/en/translation.json src/locales/el/translation.json
```

Compare changed paths with the evidence below before editing.

## User outcome

Annual transactions CSV, category CSV, and PDF downloads contain the full selected year's ledger coverage. While history loads, Settings explains the wait. If it fails, Settings offers a retry and withholds partial downloads.

## Current behavior

- `src/pages/settings/components/AnnualExportSection.tsx:17` derives available years from the current expense and income arrays. It asks for older history through `useOnDemandHistory`, then renders export actions as soon as either array contains any year.
- `src/pages/settings/components/AnnualExportCard.tsx:41` filters the arrays to the selected year. The CSV and PDF actions use that same subset. A preceding year can be visible because its last months are in the rolling 12-month boot window, with its early rows still in flight.
- `src/common/hooks/data/dataHistory.ts:64` sets both `hasHistoryLoadError` and `isHistoryLoaded` on ordinary failure so existing consumers can exit a skeleton. The loaded flag by itself cannot prove coverage. `loadHistory` at line 11 can retry that failed fetch. `src/pages/activity/ActivityView.tsx:75` demonstrates the error and retry pattern.
- `src/common/hooks/data/dataReducer.ts:133` initializes state from a snapshot. That snapshot is trimmed by `src/constants/dataCache.ts:140` and does not establish fresh full-year coverage by itself.

## Scope and conventions

Edit `AnnualExportSection.tsx`, create `components/__tests__/AnnualExportSection.test.tsx`, and update English and Greek translations if existing labels do not fit. Keep `AnnualExportCard` formatting and downloads, Pro gating, the financial-space scope, and the lifecycle contract used by Activity. Use a small named view branch for loading and retry. Translate visible copy through `t()`. If a new visual component is needed, read `ui-flows` and `src/design/palette.ts`.

## Implementation

1. Add selector-level component regressions using the existing `AnnualExportCard.test.tsx` style. Start with recent rows in a year that straddles the cutoff, render the section while older history is loading, and assert that no download action is available. Set both the loaded and error flags, assert a retry is offered and the card is still withheld. The audited baseline should fail both cases when you run `bun run test src/pages/settings/components/__tests__/AnnualExportSection.test.tsx`.
2. Preserve the existing non-Pro branch. For Pro, gate the export controls on usable data initialization and successful older history coverage, checking the error flag first and calling `useDataActions().loadHistory` from retry. The section already requests all history on mount. Use that result as the common readiness boundary for all years to avoid inferring completeness from the presence of rows. Keep the current empty behavior only once successful history verifies there are no exportable years.
3. In the test, settle retry successfully and supply rows from before and after the cutoff. Assert the chosen year stays selected when still available and the card includes the combined rows. Cover a successfully empty ledger and the unchanged non-Pro gate. Run `bun run test src/pages/settings/components/__tests__/AnnualExportSection.test.tsx src/pages/settings/components/__tests__/AnnualExportCard.test.tsx` and expect all cases to pass.

## Verification and boundaries

Run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format:check`, and `~/.agents/house-style/bin/house-lint`. Expect all to pass. Run style-check, confirm scope with `git status --short`, leave the changes uncommitted, and update the plan index.

Stop if the live history lifecycle no longer distinguishes a successful load and a settled error. Trends' missing-history behavior and matching the definitions of annual CSV and PDF totals are separate changes.
