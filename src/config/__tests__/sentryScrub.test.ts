import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  scrubBreadcrumb,
  scrubEvent,
  scrubSpan,
  scrubUrl,
} from '@/config/sentryScrub';

// Deliberately low-entropy placeholders: realistic-looking ids here trip
// secret scanners (GitGuardian flagged a random UUID in this fixture).
const INVITE =
  'https://budgard.com/join?token=00000000-0000-4000-8000-000000000000';
const QUERY =
  'https://e2e.supabase.co/rest/v1/expenses?select=*&user_id=eq.user-fixture&amount=gt.120';

describe('Sentry URL scrubbing', () => {
  it('keeps the path and drops the query and fragment', () => {
    expect(scrubUrl(INVITE)).toBe('https://budgard.com/join');
    expect(scrubUrl('/join?token=abc#x')).toBe('/join');
    expect(scrubUrl('/today')).toBe('/today');
  });

  it('scrubs the page URL, its query and the referrer on an error event', () => {
    const event = scrubEvent({
      request: {
        url: INVITE,
        query_string: 'token=abc',
        headers: { Referer: INVITE, 'User-Agent': 'test' },
      },
    });

    expect(event.request).toEqual({
      url: 'https://budgard.com/join',
      headers: { Referer: 'https://budgard.com/join', 'User-Agent': 'test' },
    });
    expect(JSON.stringify(event)).not.toContain('token');
  });

  it('scrubs fetch and navigation breadcrumbs', () => {
    expect(
      scrubBreadcrumb({
        category: 'fetch',
        data: { url: QUERY, method: 'GET' },
      }),
    ).toEqual({
      category: 'fetch',
      data: { url: 'https://e2e.supabase.co/rest/v1/expenses', method: 'GET' },
    });
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/settings', to: '/join?token=abc' },
      }).data,
    ).toEqual({ from: '/settings', to: '/join' });
  });

  it('scrubs span descriptions and drops query attributes', () => {
    const span = scrubSpan({
      description: `GET ${QUERY}`,
      data: {
        'http.url': QUERY,
        'http.query': '?select=*&amount=gt.120',
        'http.method': 'GET',
      },
    });

    expect(span.description).toBe(
      'GET https://e2e.supabase.co/rest/v1/expenses',
    );
    expect(span.data).toEqual({
      'http.url': 'https://e2e.supabase.co/rest/v1/expenses',
      'http.method': 'GET',
    });
  });

  it('scrubs spans nested in a transaction event', () => {
    const event = scrubEvent({
      transaction: '/join',
      spans: [{ description: `GET ${QUERY}` }],
    });

    expect(event.spans?.[0]?.description).toBe(
      'GET https://e2e.supabase.co/rest/v1/expenses',
    );
  });

  it('is wired into every Sentry send path, with replays only around errors', () => {
    const client = readFileSync(
      path.resolve(__dirname, '../sentryClient.ts'),
      'utf8',
    );
    const heavy = readFileSync(
      path.resolve(__dirname, '../sentryHeavy.ts'),
      'utf8',
    );

    for (const hook of [
      'beforeSend: (event) => scrubEvent(event)',
      'beforeSendTransaction: (event) => scrubEvent(event)',
      'beforeSendSpan: (span) => scrubSpan(span)',
      'beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb)',
    ]) {
      expect(client).toContain(hook);
    }
    expect(client).toContain('replaysSessionSampleRate: 0,');
    expect(heavy).toContain('maskAllText: true');
    expect(heavy).toContain('maskAllInputs: true');
    expect(heavy).toContain('blockAllMedia: true');
  });
});
