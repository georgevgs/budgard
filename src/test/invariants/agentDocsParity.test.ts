import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAgentsDoc } from '../../../scripts/syncAgentDocs.ts';

const ROOT = path.resolve(__dirname, '../../..');

const read = (file: string): string => {
  return readFileSync(path.join(ROOT, file), 'utf8');
};

// CLAUDE.md and AGENTS.md are the same rulebook read by different agents:
// Claude Code loads CLAUDE.md, Codex and friends load AGENTS.md. They drifted
// once — AGENTS.md was left at the revision before the design-system sections
// landed, so an agent reading it had no rule against tinting a surface. The
// generated copy plus this test makes that silent divergence impossible.
describe('agent docs parity', () => {
  it('has AGENTS.md generated from the current CLAUDE.md', () => {
    expect(read('AGENTS.md')).toBe(buildAgentsDoc(read('CLAUDE.md')));
  });

  // The header is what tells a human (or an agent about to "fix" a rule in the
  // wrong file) which of the two is editable.
  it('marks AGENTS.md as generated', () => {
    expect(read('AGENTS.md')).toContain('GENERATED from CLAUDE.md');
  });
});
