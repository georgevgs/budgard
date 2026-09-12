#!/usr/bin/env node
// Runs one Deno command per Edge Function against its own frozen dependency
// graph.
//
// Each function is its own Deno project with its own deno.json and deno.lock,
// because Supabase deploys them one at a time and resolves each in isolation.
// There is no workspace to check them all at once, so this walks the folders.
//
// `lock` is the only action that may rewrite a lockfile, and it needs network
// access. `check` and `audit` are frozen: they fail rather than silently
// resolving a version the lock does not pin, which is what makes the daily
// workflow's `git diff --exit-code` step meaningful.
import { readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const functions = path.join(root, 'supabase/functions');
const executable = path.join(root, 'node_modules/.bin/deno');
const action = process.argv[2];
const commands = {
  lock: ['install', '--entrypoint', '--frozen-lockfile=false', 'index.ts'],
  check: ['check', '--frozen-lockfile', 'index.ts'],
  audit: ['audit', '--frozen-lockfile', '--lock=deno.lock'],
};

if (!Object.hasOwn(commands, action)) {
  throw new Error('Usage: node scripts/edgeDependencies.mjs lock|check|audit');
}

for (const directory of readdirSync(functions, { withFileTypes: true })) {
  const cwd = path.join(functions, directory.name);
  if (!directory.isDirectory() || !existsSync(path.join(cwd, 'index.ts'))) {
    continue;
  }

  console.log(`${action}: ${directory.name}`);
  const result = spawnSync(executable, commands[action], {
    cwd,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
