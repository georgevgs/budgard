# Build performance audit

Measured on 4 October 2026 against the current workspace, with existing dependencies
installed. Each local step ran sequentially, using the same machine and default
worker count before and after. These measurements do not include dependency
installation, deploy uploads or Sentry uploads with CI credentials.

## Where the three minutes go

The [1 October CI run](https://github.com/georgevgs/budgard/actions/runs/36918240668)
spent 3m38s in its verification job:

| Step                               | Time |
| ---------------------------------- | ---: |
| Typecheck                          |  14s |
| Lint                               |  21s |
| Unit tests                         | 142s |
| Build, including another typecheck |  29s |

The remaining time was checkout, dependency installation and job housekeeping.
Vite's bundle phase reported 12.81s. The
[30 September run](https://github.com/georgevgs/budgard/actions/runs/36769313158)
was similar: tests 138s, lint 21s, typecheck 17s and build 29s. The cost was already
present before the latest dependency update.

Netlify runs `lint`, `test` and `build` sequentially. GitHub's timings explain the
same expensive steps, but Netlify's exact runtime was not measured in this audit.

Vitest reported that jsdom creation took 55% of tracked test time, imports 20%,
setup 15%, assertions 8% and transforms 2%. These are percentages of accumulated
worker time, not percentages of wall time. The suite created jsdom once for each
of its 222 test files, even for calculations and source checks.

## Changes and measured result

| Local command         | Before |  After |
| --------------------- | -----: | -----: |
| `npm run lint`        | 10.17s |  9.71s |
| `npm run test`        | 39.53s |  7.29s |
| `npm run build`       | 12.44s | 13.19s |
| Netlify command total | 62.14s | 30.19s |

The unit suite is about 82% faster locally; the complete Netlify command is about
51% faster locally. Hosted timings need a subsequent deploy to confirm.

- The main test project uses `vmThreads`: jsdom loads once per worker, while each
  file retains a fresh VM context, window and module state. This follows
  [Vitest's performance guidance](https://vitest.dev/guide/improving-performance#test-environments).
- `appLock.test.ts` and `UpgradeDialog.test.tsx` retain the `forks` pool. They
  require Node's WebCrypto or a replaceable `window.location`, which the jsdom VM
  context does not supply in the same way. One shared file list includes them
  in this project and excludes them from the main project.
- GitHub CI now bundles with `bun run vite build` after its explicit typecheck,
  so it checks types once. The normal `build` script still uses `tsc -b` before
  bundling.
- Safe-to-Spend tests now render each of four scenarios once. Their visual and
  accessible-name assertions share that render, replacing thirteen cases across
  two files. The lazy-route test no longer replaces a browser location it never
  uses.

The final suite passed 1,883 tests in 221 unique files. Comparing the JSON reports
confirmed each file ran exactly once, with only the intentionally merged
accessibility file removed. Five temporary mutations confirmed that the
consolidated tests detect missing accessible amounts, signed overspends, missing
badges, redundant status chips and incorrect amounts without a budget. The source
was restored after each mutation. Lint, build, formatting and bundle budgets also
passed. A separate V8 coverage run with two workers passed all 1,883 tests,
validating both projects under lower concurrency.

## Test ownership

Group related assertions after one action or render; give each scenario a single
test. Keep calculation permutations in utility tests, hook lifecycle and
orchestration in hook tests, and complete user journeys in E2E tests. Avoid copying
the same permutations into each layer.

The optimistic-operation suites and the real-reducer rollback suite cover
different failure modes: the latter exercises React's deferred reducer updates,
which eager setter mocks do not reproduce. Security and generated-file invariants
also protect distinct contracts; suite size alone is not a reason to remove them.

The separate E2E job took 4m49s in the latest CI run: browser installation used
2m22s and journeys, including their own build in E2E mode, used 2m18s. The preceding
run installed the browser in 23s. This variability is separate from Netlify's
deployment command.
