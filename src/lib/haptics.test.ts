import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { haptics, hapticsSettings } from './haptics';

const STORAGE_KEY = 'haptics-enabled';

const stubMatchMedia = (matches: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
    writable: true,
    configurable: true,
  });
};

describe('haptics', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    localStorage.removeItem(STORAGE_KEY);
    stubMatchMedia(false);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('selection vibrates with barely-there tick', () => {
    haptics.selection();
    expect(navigator.vibrate).toHaveBeenCalledWith(5);
  });

  it('light vibrates with short tap', () => {
    haptics.light();
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
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
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
    // @ts-expect-error -- intentionally removing for test
    delete navigator.vibrate;

    expect(() => haptics.success()).not.toThrow();
    expect(() => haptics.warning()).not.toThrow();
    expect(() => haptics.error()).not.toThrow();
    expect(() => haptics.light()).not.toThrow();
    expect(() => haptics.selection()).not.toThrow();

    if (descriptor) {
      Object.defineProperty(navigator, 'vibrate', descriptor);
    }
  });

  it('does not vibrate when user has disabled haptics', () => {
    hapticsSettings.setEnabled(false);
    haptics.success();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('vibrates again once user re-enables haptics', () => {
    hapticsSettings.setEnabled(false);
    haptics.success();
    expect(navigator.vibrate).not.toHaveBeenCalled();

    hapticsSettings.setEnabled(true);
    haptics.success();
    expect(navigator.vibrate).toHaveBeenCalledWith([10, 40, 10]);
  });

  it('does not vibrate when prefers-reduced-motion is set', () => {
    stubMatchMedia(true);

    haptics.success();
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });
});

describe('hapticsSettings', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('isEnabled defaults to true when no preference is stored', () => {
    expect(hapticsSettings.isEnabled()).toBe(true);
  });

  it('persists user preference across reads', () => {
    hapticsSettings.setEnabled(false);
    expect(hapticsSettings.isEnabled()).toBe(false);

    hapticsSettings.setEnabled(true);
    expect(hapticsSettings.isEnabled()).toBe(true);
  });

  it('isSupported reflects navigator.vibrate availability', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    expect(hapticsSettings.isSupported()).toBe(true);
  });
});
