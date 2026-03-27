import { describe, it, expect, vi, beforeEach } from 'vitest';
import { haptics } from './haptics';

describe('haptics', () => {
  beforeEach(() => {
    // Ensure navigator.vibrate exists
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it('success vibrates with double-tap pattern', () => {
    haptics.success();
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 40, 10]);
  });

  it('warning vibrates with single short pulse', () => {
    haptics.warning();
    expect(navigator.vibrate).toHaveBeenCalledWith(25);
  });

  it('error vibrates with strong pattern', () => {
    haptics.error();
    expect(navigator.vibrate).toHaveBeenCalledWith([20, 80, 20]);
  });

  it('does not throw when vibrate is not supported', () => {
    // Remove vibrate from navigator entirely
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
    // @ts-expect-error -- intentionally removing for test
    delete navigator.vibrate;

    expect(() => haptics.success()).not.toThrow();
    expect(() => haptics.warning()).not.toThrow();
    expect(() => haptics.error()).not.toThrow();

    // Restore
    if (descriptor) {
      Object.defineProperty(navigator, 'vibrate', descriptor);
    }
  });
});
