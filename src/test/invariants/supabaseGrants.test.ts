import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const MIGRATION =
  'supabase/migrations/20260823171745_explicit_authenticated_table_grants.sql';

const FULL_CRUD = [
  'categories',
  'tags',
  'expenses',
  'recurring_expenses',
  'expense_templates',
  'user_budgets',
  'category_budgets',
  'accounts',
  'account_balances',
  'debts',
  'goals',
  'push_subscriptions',
] as const;

const LIMITED = {
  no_spend_days: 'SELECT, INSERT, DELETE',
  expense_tags: 'SELECT, INSERT, DELETE',
  subscriptions: 'SELECT',
} as const;

const readMigration = (): string =>
  readFileSync(path.join(ROOT, MIGRATION), 'utf8').replace(/\s+/g, ' ');

// A policy cannot run if PostgREST cannot reach its table. This pins the
// explicit grants needed by projects that disable automatic Data API exposure.
describe('Supabase Data API grants', () => {
  it('grants authenticated users every operation backed by an RLS policy', () => {
    const sql = readMigration();

    for (const table of FULL_CRUD) {
      expect(sql).toContain(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.${table} TO authenticated, service_role;`,
      );
    }

    for (const [table, operations] of Object.entries(LIMITED)) {
      expect(sql).toContain(
        `GRANT ${operations} ON TABLE public.${table} TO authenticated`,
      );
    }
  });

  it('keeps anonymous access revoked and future tables deny-by-default', () => {
    const sql = readMigration();

    expect(sql).toContain('FROM anon, authenticated, service_role;');
    expect(sql).toContain(
      'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES',
    );
    expect(sql).not.toMatch(/GRANT [^;]+ TO anon;/);
  });
});
