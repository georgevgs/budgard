import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findRuntimePackages,
  parseBunLock,
  triageAdvisories,
} from './triage.mjs';

const lock = parseBunLock(`{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "dependencies": { "app-lib": "^1.0.0", },
      "devDependencies": { "test-runner": "^1.0.0", },
    },
  },
  "packages": {
    "app-lib": ["app-lib@1.0.0", "", { "dependencies": { "parser": "^2.0.0" }, "peerDependencies": { "react": "^19", "ajv": "^8" }, "optionalPeers": ["ajv"] }, "sha512-a"],
    "app-lib/parser": ["parser@2.0.0", "", { "dependencies": { "uri": "^1.0.0" } }, "sha512-b"],
    "parser": ["parser@1.0.0", "", {}, "sha512-c"],
    "uri": ["uri@1.0.0", "", {}, "sha512-d"],
    "react": ["react@19.0.0", "", {}, "sha512-e"],
    "ajv": ["ajv@8.0.0", "", { "dependencies": { "fast-uri": "^3" } }, "sha512-f"],
    "fast-uri": ["fast-uri@3.0.0", "", {}, "sha512-g"],
    "test-runner": ["test-runner@1.0.0", "", { "dependencies": { "ajv": "^8", "parser": "^1", "uri": "^0.9.0" } }, "sha512-h"],
    "test-runner/uri": ["uri@0.9.0", "", {}, "sha512-i"],
  },
}`);

// Advisory ranges in these fixtures are `||`-separated exact versions, so
// the matcher stays obvious; the CLI passes the real Bun.semver.satisfies.
const satisfies = (version, range) =>
  range.split('||').some((exact) => exact.trim() === version);

const advisory = (severity, ghsa, vulnerable = '1.0.0 || 2.0.0 || 19.0.0') => ({
  severity,
  title: 'x',
  vulnerable_versions: vulnerable,
  url: `https://github.com/advisories/${ghsa}`,
});

test('walks dependencies, nested copies and required peers', () => {
  const runtime = findRuntimePackages(lock);

  assert.deepEqual(
    [...runtime.keys()].sort(),
    ['app-lib', 'parser', 'react', 'uri'].sort(),
  );
  assert.deepEqual([...runtime.get('parser')], ['2.0.0']);
  assert.deepEqual([...runtime.get('uri')], ['1.0.0']);
});

test('does not follow optional peers or dev dependencies', () => {
  const runtime = findRuntimePackages(lock);

  assert.equal(runtime.has('ajv'), false);
  assert.equal(runtime.has('fast-uri'), false);
  assert.equal(runtime.has('test-runner'), false);
});

test('fails only on high or critical advisories in runtime packages', () => {
  const runtime = findRuntimePackages(lock);
  const { blocking, reported } = triageAdvisories(
    {
      uri: [advisory('high', 'GHSA-1'), advisory('moderate', 'GHSA-2')],
      react: [advisory('critical', 'GHSA-3')],
      'fast-uri': [advisory('critical', 'GHSA-4')],
      'test-runner': [advisory('high', 'GHSA-5')],
    },
    runtime,
    { satisfies },
  );

  assert.deepEqual(
    blocking.map((finding) => finding.url.split('/').pop()),
    ['GHSA-1', 'GHSA-3'],
  );
  assert.deepEqual(
    reported.map((finding) => finding.url.split('/').pop()),
    ['GHSA-2', 'GHSA-4', 'GHSA-5'],
  );
});

test('an acknowledged runtime advisory is reported, not blocking', () => {
  const runtime = findRuntimePackages(lock);
  const { blocking, reported } = triageAdvisories(
    { uri: [advisory('high', 'GHSA-1')] },
    runtime,
    { satisfies, acknowledged: { 'GHSA-1': 'reviewed: unreachable' } },
  );

  assert.equal(blocking.length, 0);
  assert.equal(reported.length, 1);
});

test('an unknown severity blocks rather than slipping through', () => {
  const runtime = findRuntimePackages(lock);
  const { blocking } = triageAdvisories(
    { uri: [advisory('unrated', 'GHSA-6')] },
    runtime,
    { satisfies },
  );

  assert.equal(blocking.length, 1);
});

test('a vulnerable copy only a dev tool installs does not block the shipped one', () => {
  const runtime = findRuntimePackages(lock);
  const { blocking, reported } = triageAdvisories(
    { uri: [advisory('high', 'GHSA-7', '0.9.0')] },
    runtime,
    { satisfies },
  );

  assert.equal(blocking.length, 0);
  assert.equal(reported[0].runtime, false);
});
