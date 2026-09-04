import { describe, it, expect, beforeEach } from 'vitest';
import { isOfflineError } from '@/lib/offlineError';

const setOnline = (value: boolean): void => {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
};

describe('isOfflineError', () => {
  beforeEach(() => {
    setOnline(true);
  });

  it('returns true when the browser is offline, whatever the error', () => {
    setOnline(false);
    expect(isOfflineError(new Error('anything'))).toBe(true);
    expect(isOfflineError({ status: 400 })).toBe(true);
  });

  it('treats fetch / network failures as offline', () => {
    expect(isOfflineError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isOfflineError({ message: 'TypeError: Failed to fetch' })).toBe(
      true,
    );
    expect(isOfflineError({ message: 'Load failed' })).toBe(true); // Safari
    expect(
      isOfflineError({ message: 'NetworkError when attempting to fetch' }),
    ).toBe(true);
  });

  it('treats aborts / timeouts as offline', () => {
    expect(isOfflineError(new DOMException('aborted', 'AbortError'))).toBe(
      true,
    );
    expect(
      isOfflineError(new DOMException('signal timed out', 'TimeoutError')),
    ).toBe(true);
    expect(isOfflineError({ message: 'The operation was aborted' })).toBe(true);
  });

  it('treats 5xx / no-response as offline (transient server)', () => {
    expect(isOfflineError({ status: 500, message: 'Server Error' })).toBe(true);
    expect(isOfflineError({ status: 503 })).toBe(true);
    expect(isOfflineError({ status: 0 })).toBe(true);
    expect(isOfflineError({ code: '502' })).toBe(true);
  });

  it('treats 4xx / validation / RLS as permanent (surface, never queue)', () => {
    expect(isOfflineError({ status: 400, message: 'Bad Request' })).toBe(false);
    expect(isOfflineError({ status: 401 })).toBe(false);
    expect(isOfflineError({ status: 403, message: 'permission denied' })).toBe(
      false,
    );
    expect(
      isOfflineError({ code: '23505', message: 'duplicate key value' }),
    ).toBe(false);
    expect(isOfflineError(new Error('validation failed'))).toBe(false);
  });

  it('treats unknown shapes as permanent', () => {
    expect(isOfflineError(undefined)).toBe(false);
    expect(isOfflineError(null)).toBe(false);
    expect(isOfflineError('weird')).toBe(false);
    expect(isOfflineError({})).toBe(false);
  });
});
