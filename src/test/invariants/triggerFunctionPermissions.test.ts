import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const MIGRATION =
  'supabase/migrations/20260825084054_restrict_trigger_function_execution.sql';
const TRIGGER_FUNCTIONS = [
  'enforce_free_account_cap',
  'enforce_free_category_cap',
  'enforce_free_recurring_expense_cap',
  'enforce_pro_only_insert',
];

const readMigration = (): string =>
  readFileSync(path.join(ROOT, MIGRATION), 'utf8').replace(/\s+/g, ' ');

describe('trigger-only function permissions', () => {
  it.each(TRIGGER_FUNCTIONS)(
    'blocks direct API calls to %s',
    (functionName) => {
      const sql = readMigration();

      expect(sql).toContain(
        `REVOKE EXECUTE ON FUNCTION public.${functionName}() FROM PUBLIC, anon, authenticated, service_role;`,
      );
    },
  );
});
