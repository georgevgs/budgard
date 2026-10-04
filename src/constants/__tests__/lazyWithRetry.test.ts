import { describe, it, expect } from 'vitest';
import { lazyWithRetry } from '@/constants/lazyWithRetry';

describe('lazyWithRetry', () => {
  it('returns a lazy component', () => {
    const FakeComponent = () => null;
    const result = lazyWithRetry(() =>
      Promise.resolve({ default: FakeComponent as never }),
    );
    // React.lazy returns an object with $$typeof Symbol
    expect(result).toBeDefined();
    expect(result.$$typeof).toBeDefined();
  });
});
