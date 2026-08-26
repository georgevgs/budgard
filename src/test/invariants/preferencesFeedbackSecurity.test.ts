import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260826160000_add_ui_preferences_and_feedback.sql',
);
const sql = readFileSync(MIGRATION, 'utf8');

describe('UI preference and feedback database boundaries', () => {
  it('enables RLS and binds every client policy to auth.uid()', () => {
    expect(sql).toContain(
      'ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY',
    );
    expect(sql).toContain(
      'ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY',
    );
    expect(sql.match(/\(SELECT auth\.uid\(\)\) = user_id/g)).toHaveLength(5);
  });

  it('keeps feedback append-only for authenticated clients', () => {
    expect(sql).toContain(
      'GRANT INSERT ON TABLE public.feedback_reports TO authenticated',
    );
    expect(sql).not.toContain(
      'GRANT SELECT ON TABLE public.feedback_reports TO authenticated',
    );
    expect(sql).not.toContain(
      'ON public.feedback_reports FOR SELECT\n  TO authenticated',
    );
  });

  it('gives preference updates both USING and WITH CHECK owner guards', () => {
    const updatePolicy = sql.slice(
      sql.indexOf('CREATE POLICY "Users can update their own UI preferences"'),
      sql.indexOf('CREATE TRIGGER user_ui_preferences_set_updated_at'),
    );

    expect(updatePolicy).toContain('USING ((SELECT auth.uid()) = user_id)');
    expect(updatePolicy).toContain(
      'WITH CHECK ((SELECT auth.uid()) = user_id)',
    );
  });
});
