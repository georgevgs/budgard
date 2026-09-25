import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeCaptureArgs } from '@/config/sentryErrors';

const DUPLICATE = {
  code: '23505',
  message:
    'duplicate key value violates unique constraint "tags_user_id_name_key"',
  details: 'Key (user_id, name)=(user-fixture, Food) already exists.',
  hint: null,
};

describe('Sentry database error normalisation', () => {
  it('reports a PostgREST rejection by its code and message', () => {
    const args: [unknown, unknown] = [
      DUPLICATE,
      { tags: { operation: 'createTag' } },
    ];
    const [error, context] = normalizeCaptureArgs(args);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).name).toBe('PostgrestError');
    expect((error as Error).message).toBe(`23505 ${DUPLICATE.message}`);
    expect(context).toEqual({
      tags: { operation: 'createTag', db_code: '23505' },
      extra: { db_hint: null },
      fingerprint: ['{{ default }}', '23505', DUPLICATE.message],
    });
  });

  it('leaves the row values in details out of the report', () => {
    const input: [unknown, unknown] = [DUPLICATE, undefined];
    const args = normalizeCaptureArgs(input);

    expect(JSON.stringify(args)).not.toContain('Food');
  });

  it('passes real Errors and non-plain contexts through untouched', () => {
    const error = new Error('offline');
    const args: [unknown, unknown] = [error, { tags: { operation: 'x' } }];

    expect(normalizeCaptureArgs(args)).toBe(args);

    const callback = () => undefined;
    const withCallback: [unknown, unknown] = [DUPLICATE, callback];
    expect(normalizeCaptureArgs(withCallback)).toBe(withCallback);
  });

  it('runs on every capture, including ones queued before the SDK loads', () => {
    const facade = readFileSync(
      path.resolve(__dirname, '../sentry.ts'),
      'utf8',
    );
    const capture = facade.slice(
      facade.indexOf('export const captureException'),
    );

    expect(capture.indexOf('normalizeCaptureArgs(rawArgs)')).toBeGreaterThan(
      -1,
    );
    expect(capture.indexOf('normalizeCaptureArgs(rawArgs)')).toBeLessThan(
      capture.indexOf('sdk.captureException(...args)'),
    );
    expect(capture.indexOf('normalizeCaptureArgs(rawArgs)')).toBeLessThan(
      capture.indexOf("enqueue({ method: 'captureException', args })"),
    );
  });
});
