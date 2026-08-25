import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const MIGRATION =
  'supabase/migrations/20260825082007_allow_recurring_trigger_date_helper.sql';

const readMigration = (): string =>
  readFileSync(path.join(ROOT, MIGRATION), 'utf8').replace(/\s+/g, ' ');

describe('recurring expense trigger permissions', () => {
  it('lets signed-in edits call the safe date helper', () => {
    const sql = readMigration();

    expect(sql).toContain(
      'ALTER FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) SECURITY INVOKER;',
    );
    expect(sql).toContain(
      'REVOKE EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) FROM PUBLIC, anon;',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.calculate_next_occurrence(TEXT, DATE, DATE) TO authenticated, service_role;',
    );
  });
});
