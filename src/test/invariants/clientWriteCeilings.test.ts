import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// supabase/tests/security_boundaries.sql proves these ceilings against a real
// database, but it runs by hand. This keeps the build from shipping a copy of
// the migration with one of them quietly removed.
const sql = readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20260925110000_bound_client_writes.sql',
  ),
  'utf8',
);

const functionBody = (name: string): string =>
  sql.slice(
    sql.indexOf(`CREATE OR REPLACE FUNCTION private.${name}`),
    sql.indexOf(
      '$$;',
      sql.indexOf(`CREATE OR REPLACE FUNCTION private.${name}`),
    ),
  );

describe('client write ceilings', () => {
  it.each([
    ['limit_feedback_reports', 'NEW.created_at := now();'],
    ['limit_product_events', 'NEW.occurred_at := now();'],
  ])('%s counts on server time, not the time a client sent', (name, stamp) => {
    const body = functionBody(name);

    expect(body).toContain(stamp);
    expect(body.indexOf(stamp)).toBeLessThan(body.indexOf('count(*)'));
    expect(body).toContain('pg_advisory_xact_lock');
  });

  it('fires both ceilings before the row is written', () => {
    expect(sql).toMatch(
      /BEFORE INSERT ON public\.feedback_reports\s+FOR EACH ROW\s+EXECUTE FUNCTION private\.limit_feedback_reports\(\)/,
    );
    expect(sql).toMatch(
      /BEFORE INSERT ON public\.product_events\s+FOR EACH ROW\s+EXECUTE FUNCTION private\.limit_product_events\(\)/,
    );
  });

  it('keeps the receipt upload policy on both the space check and the quota', () => {
    const policy = sql.slice(
      sql.indexOf('CREATE POLICY "Household can insert receipts"'),
    );

    expect(policy).toContain('private.can_access_financial_space(');
    expect(policy).toContain('private.receipt_quota_available(');
  });
});
