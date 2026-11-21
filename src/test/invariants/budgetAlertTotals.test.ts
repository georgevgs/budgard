import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  path.resolve(
    __dirname,
    '../../../supabase/migrations/20261112130000_count_loan_payments_in_budget_alerts.sql',
  ),
  'utf8',
);
const todayView = readFileSync(
  path.resolve(__dirname, '../../pages/today/TodayView.tsx'),
  'utf8',
);

const FUNCTION_NAMES = [
  'public.get_users_crossed_budget',
  'public.get_users_approaching_budget',
];

const functionBody = (name: string): string => {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${name}`);

  return sql.slice(start, sql.indexOf('$$;', start));
};

describe('budget alert totals', () => {
  it.each(FUNCTION_NAMES)('%s counts what the budget ring counts', (name) => {
    const body = functionBody(name);

    expect(body).toContain("(e.type = 'expense' AND e.is_excluded = false)");
    expect(body).toContain('e.goal_id IS NOT NULL');
    expect(body).toContain("c.kind = 'savings'");
    expect(body).toContain("d.kind <> 'credit_card'");
    expect(body).toContain('d.is_archived = false');
    expect(body).toContain('d.user_id = e.user_id');
  });

  it.each(FUNCTION_NAMES)('%s is callable by the service role only', (name) => {
    expect(sql).toContain(
      `REVOKE EXECUTE ON FUNCTION ${name}(DATE, DATE) FROM PUBLIC, anon, authenticated;`,
    );
    expect(sql).toContain(
      `GRANT  EXECUTE ON FUNCTION ${name}(DATE, DATE) TO service_role;`,
    );
  });

  it('feeds the in-app toast the ring figure', () => {
    expect(todayView).toContain('monthlyTotal: guidance.budgetSpent');
    expect(todayView).not.toContain('monthlyTotal: guidance.spentThisMonth');
  });
});
