// CLAUDE.md is the source of truth for the repo rules. Codex and other agents
// read AGENTS.md instead, and the two drifted once already — AGENTS.md was
// left behind at the point the design-system sections were added, so Codex was
// working without the rules that keep the palette achromatic.
//
// AGENTS.md is now generated from CLAUDE.md. Run this after editing CLAUDE.md;
// src/test/invariants/agentDocsParity.test.ts fails the build if you forget.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const buildAgentsDoc = (claudeMd: string): string => {
  const body = claudeMd.split('\n').slice(1).join('\n');

  return `# AGENTS.md

<!-- GENERATED from CLAUDE.md — do not edit. Change CLAUDE.md and run -->
<!-- \`npm run sync:agents\`. src/test/invariants/agentDocsParity.test.ts -->
<!-- fails if the two drift, so every agent reads the same rules. -->
${body}`;
};

const main = (): void => {
  const claudeMd = readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8');
  const target = path.join(ROOT, 'AGENTS.md');
  const next = buildAgentsDoc(claudeMd);

  if (readFileSync(target, 'utf8') === next) {
    console.log('AGENTS.md already matches CLAUDE.md');

    return;
  }

  writeFileSync(target, next);
  console.log('AGENTS.md regenerated from CLAUDE.md');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
