import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260904113851_share_household_receipts.sql',
);
const sql = readFileSync(MIGRATION, 'utf8');

describe('household receipt Storage boundary', () => {
  it('uses the shared financial-space predicate for every Storage operation', () => {
    expect(sql.match(/private\.can_access_financial_space/g)).toHaveLength(5);
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('FOR INSERT');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('FOR DELETE');
  });

  it('checks both sides of an update so objects cannot move across spaces', () => {
    const updatePolicy = sql.slice(
      sql.indexOf('CREATE POLICY "Household can update receipts"'),
      sql.indexOf('CREATE POLICY "Household can delete receipts"'),
    );

    expect(updatePolicy).toContain('USING (');
    expect(updatePolicy).toContain('WITH CHECK (');
  });

  it('rejects malformed owner folders before the UUID cast', () => {
    expect(sql).toContain('CASE');
    expect(sql).toContain('ELSE NULL');
    expect(sql).toMatch(/\[0-9a-f\]\{8\}.*\[0-9a-f\]\{12\}/);
  });
});
