import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AppLockRecord, VerifyResult } from '@/constants/appLock';

const mockLoadLock = vi.hoisted(() => vi.fn());
const mockVerifyPin = vi.hoisted(() => vi.fn());
vi.mock('@/constants/appLock', () => ({
  loadLock: mockLoadLock,
  verifyPin: mockVerifyPin,
  PIN_LENGTH: 4,
}));

const mockHasEnrolledCredential = vi.hoisted(() => vi.fn());
const mockRequestDeviceUnlock = vi.hoisted(() => vi.fn());
vi.mock('@/constants/deviceUnlock', () => ({
  hasEnrolledCredential: mockHasEnrolledCredential,
  requestDeviceUnlock: mockRequestDeviceUnlock,
}));

const mockHaptics = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  selection: vi.fn(),
}));
vi.mock('@/constants/haptics', () => ({ haptics: mockHaptics }));

import { useLockScreen } from '@/pages/security/hooks/useLockScreen';

const ERROR_HOLD_MS = 700;

const lock = (over: Partial<AppLockRecord> = {}): AppLockRecord => ({
  salt: 'ab',
  hash: 'cd',
  biometrics: false,
  failedAttempts: 0,
  lockedUntil: null,
  ...over,
});

type Screen = { current: ReturnType<typeof useLockScreen> };

const type = async (screen: Screen, digits: string): Promise<void> => {
  for (const digit of digits) {
    await act(async () => {
      screen.current.press(Number(digit));
    });
  }
};

const onUnlock = vi.fn();

const render = () => renderHook(() => useLockScreen(onUnlock));

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadLock.mockReturnValue(lock());
  mockHasEnrolledCredential.mockReturnValue(false);
  mockRequestDeviceUnlock.mockResolvedValue(false);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useLockScreen', () => {
  it('verifies the PIN once the last digit lands, and unlocks', async () => {
    mockVerifyPin.mockResolvedValue({ ok: true } satisfies VerifyResult);
    const { result } = render();

    await type(result, '123');
    expect(mockVerifyPin).not.toHaveBeenCalled();
    expect(result.current.pin).toBe('123');

    await type(result, '4');
    expect(mockVerifyPin).toHaveBeenCalledWith('1234');
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(mockHaptics.success).toHaveBeenCalled();
  });

  it('reports a wrong PIN, then clears the keypad once the message has been read', async () => {
    mockVerifyPin.mockResolvedValue({
      ok: false,
      attemptsLeft: 4,
      lockedUntil: null,
    } satisfies VerifyResult);
    const { result } = render();

    await type(result, '1234');
    expect(onUnlock).not.toHaveBeenCalled();
    expect(mockHaptics.error).toHaveBeenCalled();
    expect(result.current.hasError).toBe(true);
    expect(result.current.message).toBe('security.lock.wrong');
    expect(result.current.pin).toBe('1234');

    act(() => {
      vi.advanceTimersByTime(ERROR_HOLD_MS);
    });
    expect(result.current.pin).toBe('');
    expect(result.current.hasError).toBe(false);
  });

  it('ignores keypresses while the wrong-PIN message is showing', async () => {
    mockVerifyPin.mockResolvedValue({
      ok: false,
      attemptsLeft: 4,
      lockedUntil: null,
    } satisfies VerifyResult);
    const { result } = render();

    await type(result, '1234');
    await type(result, '9');

    expect(result.current.pin).toBe('1234');
  });

  it('says how long the wait is once the keypad has locked out', async () => {
    mockVerifyPin.mockResolvedValue({
      ok: false,
      attemptsLeft: 0,
      lockedUntil: Date.now() + 60_000,
    } satisfies VerifyResult);
    const { result } = render();

    await type(result, '1234');

    expect(result.current.message).toBe('security.lock.cooldown');
    expect(result.current.isCoolingDown).toBe(true);
  });

  it('refuses input while a cooldown from a previous visit is still running', async () => {
    mockLoadLock.mockReturnValue(lock({ lockedUntil: Date.now() + 60_000 }));
    const { result } = render();

    await type(result, '1234');

    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.pin).toBe('');
    expect(mockVerifyPin).not.toHaveBeenCalled();
  });

  it('accepts input again once a stored cooldown has passed', async () => {
    mockLoadLock.mockReturnValue(lock({ lockedUntil: Date.now() - 1 }));
    mockVerifyPin.mockResolvedValue({ ok: true } satisfies VerifyResult);
    const { result } = render();

    await type(result, '1234');

    expect(result.current.isCoolingDown).toBe(false);
    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it('backspaces the last digit', async () => {
    const { result } = render();

    await type(result, '12');
    act(() => result.current.backspace());

    expect(result.current.pin).toBe('1');
  });

  it('offers the device prompt on arrival when one is enrolled and enabled', async () => {
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    mockHasEnrolledCredential.mockReturnValue(true);
    mockRequestDeviceUnlock.mockResolvedValue(true);

    const { result } = render();
    await act(async () => {});

    expect(result.current.canUseDevice).toBe(true);
    expect(mockRequestDeviceUnlock).toHaveBeenCalledOnce();
    expect(onUnlock).toHaveBeenCalledOnce();
  });

  it('does not offer the device prompt when the lock does not use one', async () => {
    mockHasEnrolledCredential.mockReturnValue(true);

    const { result } = render();
    await act(async () => {});

    expect(result.current.canUseDevice).toBe(false);
    expect(mockRequestDeviceUnlock).not.toHaveBeenCalled();
  });

  it('does not offer the device prompt when nothing is enrolled on this device', async () => {
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));

    const { result } = render();
    await act(async () => {});

    expect(result.current.canUseDevice).toBe(false);
    expect(mockRequestDeviceUnlock).not.toHaveBeenCalled();
  });

  it('does not unlock from a prompt that answers after the screen is gone', async () => {
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    mockHasEnrolledCredential.mockReturnValue(true);
    let answer: (ok: boolean) => void = () => {};
    mockRequestDeviceUnlock.mockReturnValue(
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
    );

    const { unmount } = render();
    unmount();
    await act(async () => {
      answer(true);
    });

    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('falls back to the keypad with a message when the prompt is refused', async () => {
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    mockHasEnrolledCredential.mockReturnValue(true);
    const { result } = render();
    await act(async () => {});

    await act(async () => {
      await result.current.tryDeviceUnlock();
    });

    expect(onUnlock).not.toHaveBeenCalled();
    expect(result.current.message).toBe('security.lock.deviceFailed');
  });

  it('unlocks when the prompt is satisfied on demand', async () => {
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    mockHasEnrolledCredential.mockReturnValue(true);
    const { result } = render();
    await act(async () => {});

    mockRequestDeviceUnlock.mockResolvedValue(true);
    await act(async () => {
      await result.current.tryDeviceUnlock();
    });

    expect(onUnlock).toHaveBeenCalledOnce();
    expect(mockHaptics.success).toHaveBeenCalled();
  });
});
