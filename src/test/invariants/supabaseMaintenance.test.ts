import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const CONFIG = readFileSync(path.join(ROOT, 'supabase/config.toml'), 'utf8');
const MIGRATION = readFileSync(
  path.join(
    ROOT,
    'supabase/migrations/20260904120958_optimize_household_policy_and_checkout_window.sql',
  ),
  'utf8',
);
const FUNCTION_HARDENING_MIGRATION = readFileSync(
  path.join(
    ROOT,
    'supabase/migrations/20260904170059_harden_advisor_functions.sql',
  ),
  'utf8',
);

describe('Supabase maintenance configuration', () => {
  it('matches production Postgres and current local email configuration', () => {
    expect(CONFIG).toContain('major_version = 17');
    expect(CONFIG).toContain('[local_smtp]');
    expect(CONFIG).not.toContain('[inbucket]');
  });

  it('keeps household JWT lookup in an RLS initplan', () => {
    expect(MIGRATION).toContain(
      "COALESCE((SELECT auth.jwt()) ->> 'email', '')",
    );
  });

  it('serializes checkout limits with an explicitly typed window', () => {
    expect(MIGRATION).toContain(
      "v_window CONSTANT INTERVAL := INTERVAL '10 minutes'",
    );
    expect(MIGRATION).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(MIGRATION).toContain("SET search_path = ''");
  });

  it('hardens legacy database functions without changing their signatures', () => {
    expect(FUNCTION_HARDENING_MIGRATION).toContain(
      "ALTER FUNCTION public.tags(public.expenses) SET search_path = ''",
    );
    expect(FUNCTION_HARDENING_MIGRATION).toContain(
      'p_user_id IS NOT NULL AND p_user_id <> v_caller_id',
    );
    expect(FUNCTION_HARDENING_MIGRATION).toContain("SET search_path = ''");
    expect(FUNCTION_HARDENING_MIGRATION).toContain(
      'FROM public.recurring_expenses re',
    );
  });
});
