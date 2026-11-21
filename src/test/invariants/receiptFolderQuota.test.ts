import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = path.resolve(__dirname, '../../../supabase/migrations');
const MIGRATION = '20261121100000_canonical_receipt_folders.sql';
const INSERT_POLICY = 'CREATE POLICY "Household can insert receipts"';
const UPDATE_POLICY = 'CREATE POLICY "Household can update receipts"';
const CANONICAL_FOLDER_MATCH = /~\s+'\^\[0-9a-f\]\{8\}/;

const sql = readFileSync(path.join(MIGRATIONS, MIGRATION), 'utf8');

const statementFrom = (marker: string): string => {
  const start = sql.indexOf(marker);

  return sql.slice(start, sql.indexOf(';', start));
};

const definesReceiptWritePolicy = (file: string): boolean => {
  const contents = readFileSync(path.join(MIGRATIONS, file), 'utf8');

  return contents.includes(INSERT_POLICY) || contents.includes(UPDATE_POLICY);
};

describe('receipt folders count against the quota', () => {
  it('accepts only the lower-case folder on upload and checks the quota', () => {
    const statement = statementFrom(INSERT_POLICY);

    expect(statement).toMatch(CANONICAL_FOLDER_MATCH);
    expect(statement).not.toContain('~*');
    expect(statement).toContain('private.receipt_quota_available(');
  });

  it('holds an overwrite to the same space and quota as an upload', () => {
    const statement = statementFrom(UPDATE_POLICY);
    const withCheck = statement.slice(statement.indexOf('WITH CHECK ('));

    expect(statement).toMatch(CANONICAL_FOLDER_MATCH);
    expect(statement).not.toContain('~*');
    expect(withCheck).toContain('private.can_access_financial_space(');
    expect(withCheck).toContain('private.receipt_quota_available(');
  });

  it('refuses a password session before the checkout counter takes its lock', () => {
    const start = sql.indexOf(
      'CREATE OR REPLACE FUNCTION public.consume_checkout_attempt()',
    );
    const body = sql.slice(start, sql.indexOf('$$;', start));
    const guard = body.indexOf(
      'IF v_user_id IS NULL OR NOT private.is_passwordless_session() THEN',
    );

    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(body.indexOf('pg_advisory_xact_lock'));
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.consume_checkout_attempt() FROM PUBLIC, anon;',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.consume_checkout_attempt() TO authenticated;',
    );
  });

  it('is the newest migration that defines a receipts write policy', () => {
    const definitions = readdirSync(MIGRATIONS)
      .filter((file) => file.endsWith('.sql'))
      .filter(definesReceiptWritePolicy);
    const newest = [...definitions].sort().pop();

    expect(newest).toBe(MIGRATION);
  });
});
