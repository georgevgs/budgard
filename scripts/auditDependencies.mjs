#!/usr/bin/env bun
// Audits the npm tree and fails only on high or critical advisories in
// packages that ship to users. See scripts/audit/triage.mjs for where that
// line is drawn and why. Tooling advisories are printed, and in GitHub
// Actions they become warning annotations: visible on the run, no email.
//
// Runs under bun rather than node for `Bun.semver`, the range matcher the
// package manager itself uses, instead of a hand-written one.
import { readFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  advisoryId,
  findRuntimePackages,
  parseBunLock,
  triageAdvisories,
} from './audit/triage.mjs';

// A runtime advisory reviewed and judged unreachable, keyed by GHSA id, with
// the reason. Remove the entry once the dependency is bumped past it.
const acknowledged = {};

const root = fileURLToPath(new URL('..', import.meta.url));
const lock = parseBunLock(readFileSync(path.join(root, 'bun.lock'), 'utf8'));
const runtime = findRuntimePackages(lock);
const { blocking, reported } = triageAdvisories(runAudit(), runtime, {
  satisfies: Bun.semver.satisfies,
  acknowledged,
});
const inActions = process.env.GITHUB_ACTIONS === 'true';

for (const finding of reported) {
  console.log(describe(finding));
  if (inActions) {
    console.log(`::warning title=${finding.name}::${describe(finding)}`);
  }
}

for (const finding of blocking) {
  console.error(describe(finding));
  if (inActions) {
    console.log(`::error title=${finding.name}::${describe(finding)}`);
  }
}

writeSummary();
console.log(
  `${blocking.length} blocking, ${reported.length} reported (tooling, low/moderate or acknowledged).`,
);
if (blocking.length > 0) {
  process.exit(1);
}

function runAudit() {
  const result = spawnSync('bun', ['audit', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }

  // bun audit exits 1 whenever it finds anything, so the exit code says
  // nothing here. Output that does not parse is a real failure — an
  // unreachable registry must not read as a clean tree.
  try {
    return JSON.parse(result.stdout);
  } catch {
    process.stderr.write(result.stderr);
    throw new Error('bun audit did not return a JSON report');
  }
}

function describe(finding) {
  const scope = finding.runtime ? 'runtime' : 'tooling';
  return `${finding.severity} [${scope}] ${finding.name} ${finding.vulnerable_versions}: ${finding.title} (${advisoryId(finding)})`;
}

function writeSummary() {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) {
    return;
  }

  const rows = [...blocking, ...reported].map(
    (finding) =>
      `| ${finding.severity} | ${finding.runtime ? 'runtime' : 'tooling'} | ${finding.name} | [${advisoryId(finding)}](${finding.url}) | ${blocking.includes(finding) ? 'fails' : 'reported'} |`,
  );
  if (rows.length === 0) {
    appendFileSync(file, '### npm audit\n\nNo known advisories.\n');
    return;
  }

  appendFileSync(
    file,
    [
      '### npm audit',
      '',
      '| Severity | Ships | Package | Advisory | Result |',
      '| --- | --- | --- | --- | --- |',
      ...rows,
      '',
    ].join('\n'),
  );
}
