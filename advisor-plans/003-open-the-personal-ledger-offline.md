# 003 · Open the personal ledger offline

| Priority | Effort | Risk | Category | Depends on | Planned at |
| --- | --- | --- | --- | --- | --- |
| P1 | M | Medium | Correctness | None | `a041746`, 2026-11-24 |

```sh
git diff --stat a041746 -- src/common/contexts src/locales/en/translation.json src/locales/el/translation.json e2e/offline.spec.ts e2e/fixtures
```

Compare any changed paths with the current behavior below. The boundary around a remembered shared owner is part of the fix.

## User outcome

A signed-in user can relaunch a previously used personal ledger when the household lookup is unavailable. If the remembered selection is a shared ledger and household access cannot be validated, the user can retry or explicitly open their personal ledger.

## Current behavior

- `src/common/contexts/FinancialSpaceProvider.tsx:67` initializes the selected owner from the actor-scoped preference. `buildSpaces` at line 158 can construct the personal space from the authenticated user ID alone. The effect at line 110 still fetches visible shares and records its error.
- `src/common/contexts/AuthenticatedProviders.tsx:33` replaces the entire route tree with a skeleton or error while reading shares. Its `DataProvider` at line 62 never sees the actor's valid local snapshot in this state.
- `src/common/hooks/data/useDataLayer.ts:46` hydrates only the current actor and owner key. `src/constants/dataCache.ts:98` validates that key, and `docs/household-sharing-design.md` describes the shared authorization model.
- `e2e/offline.spec.ts:11` waits for Today to load before simulating failure. It covers queueing and reconnect, leaving warm-cache relaunch uncovered.

## Scope and conventions

Edit `FinancialSpaceProvider.tsx`, `FinancialSpaceContext.tsx`, `AuthenticatedProviders.tsx` and their named tests under `src/common/contexts/__tests__/`. Scope copy to the two translation JSONs and browser coverage to `e2e/offline.spec.ts` and the mock fixture if required. Keep signed-out routing, subscription readiness, RLS, and the existing actor/owner snapshot boundary. Keep household error feedback local to controls that rely on household metadata. Use `t()` for text and accessible labels, named view branches, and a visible recovery action. Consult `ui-flows` and `src/design/palette.ts` before changing the fallback UI.

## Implementation

1. Add provider tests with a known signed-in actor ID. A personal owner renders during share loading and after a rejected lookup. A remembered shared owner stays blocked before validation or on failure. Keep the subscription-readiness test. Verify with `bun run test src/common/contexts/__tests__/AuthenticatedProviders.test.tsx src/common/contexts/__tests__/FinancialSpaceProvider.test.tsx`. The new personal case should fail on the baseline.
2. Have the provider distinguish an own-space selection from a stored or selected shared owner. Gate mounting on share readiness only for the shared case while keeping the household lookup in parallel. Offer an explicit open-personal action on the shared error screen, using `selectSpace` with the actor ID. Allow a household lookup retry after reconnect without changing the selected owner. A rejected or stale response must never select a previous actor's shared space. Preserve successful revocation fallback and owner-key remounts.
3. Add an offline relaunch to the existing browser suite. Start with a signed-in personal fixture, load Today, wait for the scoped snapshot to be present, disable mock backend access, then reload and assert the cached transaction remains visible. Verify the same signed-in fixture can refresh household metadata on retry or reconnect without switching the selected owner. Run `bun run test:e2e -- e2e/offline.spec.ts` in an environment with Playwright Chromium. Expect both the current queue test and the relaunch test to pass.

## Verification and boundaries

Run the narrow provider suites, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`, `bun run format:check`, and `~/.agents/house-style/bin/house-lint`. Expect all to pass. Run style-check, inspect the working diff, leave it uncommitted, and update the index.

Stop if a proposed fallback would display shared data before the existing access check or if retention of a valid personal snapshot requires changing the cache format. Auth session expiry, first offline launch, queued payload recovery, and replay concurrency have separate contracts.
