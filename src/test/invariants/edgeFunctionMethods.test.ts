import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');

const readFunction = (name: string): string =>
  readFileSync(
    path.join(ROOT, 'supabase', 'functions', name, 'index.ts'),
    'utf8',
  );

const readFunctionConfig = (
  name: string,
): { imports: Record<string, string> } =>
  JSON.parse(
    readFileSync(
      path.join(ROOT, 'supabase', 'functions', name, 'deno.json'),
      'utf8',
    ),
  ) as { imports: Record<string, string> };

const SUPABASE_FUNCTIONS = [
  'delete-account',
  'send-push-notifications',
  'stripe-checkout',
  'stripe-portal',
  'stripe-webhook',
];

describe('mutating Edge Function boundaries', () => {
  it.each(SUPABASE_FUNCTIONS)('%s rejects methods other than POST', (name) => {
    expect(readFunction(name)).toContain("if (req.method !== 'POST')");
  });

  it.each(SUPABASE_FUNCTIONS)(
    '%s uses the exact shared Supabase dependency',
    (name) => {
      const source = readFunction(name);
      const config = readFunctionConfig(name);

      expect(source).toContain("from 'supabase'");
      expect(source).not.toContain('esm.sh/@supabase/supabase-js@2');
      expect(config.imports.supabase).toBe('npm:@supabase/supabase-js@2.112.2');
    },
  );

  it('does not create checkout when the subscription lookup fails', () => {
    const source = readFunction('stripe-checkout');

    expect(source).toContain('error: subscriptionError');
    expect(source).toContain("{ error: 'Unable to verify subscription' }, 503");
  });

  it('reuses the stored Stripe customer when a subscriber returns', () => {
    const source = readFunction('stripe-checkout');

    expect(source).toContain(".select('status, stripe_customer_id')");
    expect(source).toContain('resolveStripeCustomerReference(');
    expect(source).toContain('params.set(customerReference.parameter');
  });

  it('cancels billing inside the account-deletion sequence', () => {
    const source = readFunction('delete-account');

    expect(source).toContain('runAccountDeletion({');
    expect(source).toContain('cancelStripeSubscription({');
    expect(source).toContain(".select('stripe_subscription_id, status')");
  });
});
