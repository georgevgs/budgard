import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/120',
      configurable: true,
    });
    Object.defineProperty(navigator, 'standalone', {
      value: false,
      configurable: true,
    });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
    } as unknown as MediaQueryList);
  });

  it('detects non-iOS non-standalone by default', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isIosSafari).toBe(false);
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.isAndroidInstallable).toBe(false);
  });

  it('detects iOS Safari', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Safari/604',
      configurable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIosSafari).toBe(true);
  });

  it('excludes Chrome on iOS from iOS Safari detection', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) CriOS/120 Safari/604',
      configurable: true,
    });

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIosSafari).toBe(false);
  });

  it('detects standalone mode via media query', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
    } as unknown as MediaQueryList);

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isStandalone).toBe(true);
  });

  it('becomes installable when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current.isAndroidInstallable).toBe(true);
  });

  it('triggers Android install prompt', async () => {
    const prompt = vi.fn();
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      const event = new Event('beforeinstallprompt');
      Object.assign(event, {
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(event);
    });

    await act(async () => {
      await result.current.triggerAndroidInstall();
    });

    expect(prompt).toHaveBeenCalled();
    // After install, prompt is consumed
    expect(result.current.isAndroidInstallable).toBe(false);
  });
});
