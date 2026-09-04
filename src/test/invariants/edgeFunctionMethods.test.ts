import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');

const readFunction = (name: string): string =>
  readFileSync(
    path.join(ROOT, 'supabase', 'functions', name, 'index.ts'),
    'utf8',
  );

describe('mutating Edge Function boundaries', () => {
  it.each([
    'delete-account',
    'send-push-notifications',
    'stripe-checkout',
    'stripe-portal',
    'stripe-webhook',
  ])('%s rejects methods other than POST', (name) => {
    expect(readFunction(name)).toContain("if (req.method !== 'POST')");
  });

  it('does not create checkout when the subscription lookup fails', () => {
    const source = readFunction('stripe-checkout');

    expect(source).toContain('error: subscriptionError');
    expect(source).toContain("{ error: 'Unable to verify subscription' }, 503");
  });
});
