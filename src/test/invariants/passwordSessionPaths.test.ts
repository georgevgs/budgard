import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261112100000_guard_remaining_password_session_paths.sql',
  ),
  'utf8',
);

const GUARDED_POLICIES = [
  'Users can view their own UI preferences',
  'Users can insert their own UI preferences',
  'Users can update their own UI preferences',
  'Users can submit their own feedback',
  'Users can submit their own product events',
];

const statementFor = (policy: string): string => {
  const start = sql.indexOf(`ALTER POLICY "${policy}"`);

  return sql.slice(start, sql.indexOf(';', start));
};

describe('password sessions on the paths outside the finance predicate', () => {
  it('refuses a password session before the recurring processor reads a row', () => {
    const body = sql.slice(
      sql.indexOf(
        'CREATE OR REPLACE FUNCTION public.process_recurring_expenses',
      ),
      sql.indexOf('$function$;'),
    );
    const guard = body.indexOf(
      'IF v_caller_id IS NULL OR NOT private.is_passwordless_session() THEN',
    );

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(body.indexOf('FROM public.recurring_expenses'));
  });

  it.each(GUARDED_POLICIES)('gates "%s" on the session method', (policy) => {
    const statement = statementFor(policy);
    const clauses = statement.match(/USING \(|WITH CHECK \(/g) ?? [];
    const guards =
      statement.match(/\(SELECT private\.is_passwordless_session\(\)\)/g) ?? [];

    expect(clauses.length).toBeGreaterThan(0);
    expect(guards).toHaveLength(clauses.length);
  });

  it('keeps the receipts bucket private and image-only', () => {
    expect(sql).toMatch(/ON CONFLICT \(id\) DO UPDATE\s+SET public = false/);
    expect(sql).toContain(
      "ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']",
    );
  });
});
