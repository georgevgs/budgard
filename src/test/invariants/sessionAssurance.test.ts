import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  UNTRUSTED_METHODS,
  isPasswordlessSession,
  isRecentlyAuthenticated,
} from '../../../supabase/functions/_shared/sessionAssurance.ts';

const ROOT = path.resolve(__dirname, '../../..');
const NOW = 1_790_000_000;
const WINDOW = 600;

// Only the payload is read; the signature is the gateway's business.
const bearer = (payload: Record<string, unknown>): string => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `Bearer ${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
};

const session = (...methods: string[]): string =>
  bearer({
    sub: 'user-1',
    // base64url output for this string contains both '-' and '_', which the
    // decoder must translate before atob.
    email: 'ÿ>>>???@example.invalid',
    amr: methods.map((method) => ({ method, timestamp: NOW - 60 })),
  });

describe('Edge Function session assurance', () => {
  it.each(['otp', 'magiclink', 'email/signup'])(
    'accepts a %s sign-in',
    (method) => {
      expect(isPasswordlessSession(session(method))).toBe(true);
    },
  );

  it.each(['password', 'anonymous'])('refuses a %s session', (method) => {
    expect(isPasswordlessSession(session(method))).toBe(false);
  });

  it('refuses a session that holds a password entry beside an email one', () => {
    expect(isPasswordlessSession(session('otp', 'password'))).toBe(false);
  });

  it('reads RFC 8176 string entries the same way', () => {
    expect(isPasswordlessSession(bearer({ amr: ['password'] }))).toBe(false);
    expect(isPasswordlessSession(bearer({ amr: ['otp'] }))).toBe(true);
  });

  it('refuses a token it cannot decode', () => {
    expect(isPasswordlessSession('Bearer not-a-jwt')).toBe(false);
    expect(isPasswordlessSession('Bearer a.%%%.c')).toBe(false);
  });

  it('requires a recent email sign-in for irreversible actions', () => {
    expect(isRecentlyAuthenticated(session('otp'), WINDOW, NOW)).toBe(true);
    expect(
      isRecentlyAuthenticated(
        bearer({ amr: [{ method: 'otp', timestamp: NOW - WINDOW - 1 }] }),
        WINDOW,
        NOW,
      ),
    ).toBe(false);
  });

  it('refuses a recent password sign-in for irreversible actions', () => {
    expect(isRecentlyAuthenticated(session('password'), WINDOW, NOW)).toBe(
      false,
    );
  });

  it('fails closed when no sign-in time is readable', () => {
    expect(
      isRecentlyAuthenticated(bearer({ sub: 'user-1' }), WINDOW, NOW),
    ).toBe(false);
  });

  it('refuses exactly the methods the database refuses', () => {
    const migration = readFileSync(
      path.join(
        ROOT,
        'supabase/migrations/20260925100000_reject_password_sessions.sql',
      ),
      'utf8',
    );
    const match = migration.match(
      /COALESCE\(claim\.entry ->> 'method', claim\.entry #>> '\{\}'\)\s+IN \(([^)]*)\)/,
    );
    const sqlMethods = (match?.[1] ?? '')
      .split(',')
      .map((method) => method.trim().replace(/^'|'$/g, ''))
      .filter(Boolean);

    expect(sqlMethods.sort()).toEqual([...UNTRUSTED_METHODS].sort());
  });
});
