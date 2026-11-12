import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS = path.resolve(__dirname, '../../../supabase/migrations');
const sql = readFileSync(
  path.join(
    MIGRATIONS,
    '20261112110000_hoist_financial_space_policy_check.sql',
  ),
  'utf8',
);
const householdSql = readFileSync(
  path.join(MIGRATIONS, '20260831151127_add_secure_household_spaces.sql'),
  'utf8',
);

const functionBody = (signature: string): string => {
  const start = sql.indexOf(signature);

  return sql.slice(start, sql.indexOf('$$;', start));
};

describe('hoisted financial-space read check', () => {
  it('returns no space at all to a password or anonymous session', () => {
    const body = functionBody(
      'CREATE FUNCTION private.accessible_financial_space_ids()',
    );
    const branches = body.split('UNION ALL');

    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch).toContain('(SELECT private.is_passwordless_session())');
    }
  });

  it('shares a household only while accepted and while the owner is Pro', () => {
    const body = functionBody(
      'CREATE FUNCTION private.accessible_financial_space_ids()',
    );

    expect(body).toContain('share.member_id = (SELECT auth.uid())');
    expect(body).toContain("share.status = 'accepted'");
    expect(body).toContain(
      "subscription.status IN ('trialing', 'active', 'past_due')",
    );
  });

  it('answers the per-row predicate from the same set, so the two cannot drift', () => {
    const body = functionBody(
      'CREATE OR REPLACE FUNCTION private.can_access_financial_space',
    );

    expect(body).toContain(
      'p_owner_id IN (SELECT private.accessible_financial_space_ids())',
    );
    expect(body).not.toContain('household_shares');
  });

  it('rewrites every finance read policy the household migration created', () => {
    const created = [
      ...householdSql.matchAll(/CREATE POLICY "(Household can [^"]+)"/g),
    ]
      .map((match) => match[1])
      .filter(
        (name) =>
          'Household can manage expenses' !== name &&
          'Household can create expenses' !== name,
      );

    expect(created.length).toBeGreaterThan(10);
    for (const name of created) {
      expect(sql).toContain(`'${name}'`);
    }
  });
});
