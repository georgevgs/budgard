import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// The push worker's secret lives only in Vault: pg_cron reads it there and
// the function asks the database whether a token matches. A second copy in
// the function's environment is what made rotation a two-step job with a gap
// that refused runs, so this keeps one from creeping back.
const ROOT = path.resolve(__dirname, '../../..');
const read = (relative: string): string =>
  readFileSync(path.join(ROOT, relative), 'utf8');

const worker = read('supabase/functions/send-push-notifications/index.ts');
const verifier = read(
  'supabase/migrations/20260925150000_verify_push_cron_secret_in_vault.sql',
);
const cronJob = read(
  'supabase/migrations/20260925130000_read_push_cron_secret_from_vault.sql',
);

const VAULT_NAME = "'send_push_notifications_cron_secret'";

describe('push cron secret', () => {
  it('is checked against Vault, never an environment copy', () => {
    expect(worker).not.toContain("Deno.env.get('CRON_SECRET')");
    expect(worker).toContain("'push_cron_secret_matches'");
    expect(worker).toContain('if (tokenMatches !== true)');
  });

  it('is read from the same Vault entry the cron job sends', () => {
    expect(verifier).toContain(`WHERE secret.name = ${VAULT_NAME}`);
    expect(cronJob).toContain(`WHERE name = ${VAULT_NAME}`);
  });

  it('answers only the service role, and only with a boolean', () => {
    expect(verifier).toContain('RETURNS BOOLEAN');
    expect(verifier).toMatch(
      /REVOKE ALL ON FUNCTION public\.push_cron_secret_matches\(TEXT\)\s+FROM PUBLIC, anon, authenticated;/,
    );
    expect(verifier).toContain(
      'GRANT EXECUTE ON FUNCTION public.push_cron_secret_matches(TEXT) TO service_role;',
    );
  });

  it('matches nothing when the secret is empty or missing', () => {
    expect(verifier).toContain("AND secret.decrypted_secret <> ''");
    expect(verifier).toMatch(/COALESCE\([\s\S]+false\s*\)/);
  });
});
