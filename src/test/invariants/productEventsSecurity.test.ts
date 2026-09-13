import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  'supabase/migrations/20260913165741_add_product_events.sql',
  'utf8',
);
const service = readFileSync('src/common/api/productEventService.ts', 'utf8');

describe('product event privacy boundary', () => {
  it('keeps the event log append-only for authenticated clients', () => {
    expect(migration).toContain(
      'ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain(
      'GRANT INSERT ON TABLE public.product_events TO authenticated',
    );
    expect(migration).not.toContain(
      'GRANT SELECT ON TABLE public.product_events TO authenticated',
    );
    expect(migration).not.toContain(
      'ON public.product_events FOR SELECT\n  TO authenticated',
    );
  });

  it('cannot accept free-form or financial payload fields', () => {
    const tableDefinition = migration.slice(
      migration.indexOf('CREATE TABLE public.product_events'),
      migration.indexOf('CREATE INDEX product_events_user_occurred_idx'),
    );

    expect(tableDefinition).not.toMatch(
      /metadata|properties|amount|description/i,
    );
    expect(migration).toContain("load_kind IN ('cold', 'cached')");
    expect(migration).toContain('event_name IN (');
  });

  it('keeps the client vocabulary in lock-step with the database check', () => {
    const sqlNames = Array.from(
      migration
        .slice(
          migration.indexOf('event_name IN ('),
          migration.indexOf('  )),', migration.indexOf('event_name IN (')),
        )
        .matchAll(/'([^']+)'/g),
      (match) => match[1],
    );
    const clientNames = Array.from(
      service
        .slice(
          service.indexOf('export type ProductEventName'),
          service.indexOf('export type ProductEventInput'),
        )
        .matchAll(/'([^']+)'/g),
      (match) => match[1],
    );

    expect(clientNames).toEqual(sqlNames);
  });
});
