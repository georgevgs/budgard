import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lazyWithRetry } from './lazyWithRetry';

describe('lazyWithRetry', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/expenses', replace: vi.fn() },
      writable: true,
      configurable: true,
    });
  });

  it('returns a lazy component', () => {
    const FakeComponent = () => null;
    const result = lazyWithRetry(() => Promise.resolve({ default: FakeComponent as never }));
    // React.lazy returns an object with $$typeof Symbol
    expect(result).toBeDefined();
    expect(result.$$typeof).toBeDefined();
  });
});
