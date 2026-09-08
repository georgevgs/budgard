import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockSetPin = vi.hoisted(() => vi.fn());
vi.mock('@/constants/appLock', () => ({
  setPin: mockSetPin,
  PIN_LENGTH: 4,
}));

const mockHaptics = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  selection: vi.fn(),
}));
vi.mock('@/constants/haptics', () => ({ haptics: mockHaptics }));

import { useSetPin } from '@/pages/settings/hooks/useSetPin';

const MISMATCH_HOLD_MS = 700;

type Dialog = { current: ReturnType<typeof useSetPin> };

const type = async (dialog: Dialog, digits: string): Promise<void> => {
  for (const digit of digits) {
    await act(async () => {
      dialog.current.press(Number(digit));
    });
  }
};

const onSaved = vi.fn();

const render = () =>
  renderHook(({ isOpen }) => useSetPin({ isOpen, onSaved }), {
    initialProps: { isOpen: true },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mockSetPin.mockResolvedValue(undefined);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSetPin', () => {
  it('takes the first full entry as the PIN to confirm', async () => {
    const { result } = render();
    expect(result.current.step).toBe('choose');

    await type(result, '1234');

    expect(result.current.step).toBe('confirm');
    expect(result.current.entry).toBe('');
    expect(mockSetPin).not.toHaveBeenCalled();
  });

  it('saves the PIN when the confirmation matches', async () => {
    const { result } = render();

    await type(result, '1234');
    await type(result, '1234');

    expect(mockSetPin).toHaveBeenCalledWith('1234');
    expect(mockHaptics.success).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('rejects a confirmation that differs, and starts the pair over', async () => {
    const { result } = render();

    await type(result, '1234');
    await type(result, '4321');

    expect(mockSetPin).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(mockHaptics.error).toHaveBeenCalled();
    expect(result.current.hasError).toBe(true);
    expect(result.current.message).toBe('security.setPin.mismatch');

    act(() => {
      vi.advanceTimersByTime(MISMATCH_HOLD_MS);
    });
    expect(result.current.step).toBe('choose');
    expect(result.current.entry).toBe('');
    expect(result.current.hasError).toBe(false);
  });

  it('ignores keypresses while the mismatch message is showing', async () => {
    const { result } = render();

    await type(result, '1234');
    await type(result, '4321');
    await type(result, '9');

    expect(result.current.entry).toBe('4321');
  });

  it('starts over when the dialog is reopened', async () => {
    const { result, rerender } = render();

    await type(result, '1234');
    await type(result, '56');
    rerender({ isOpen: false });
    rerender({ isOpen: true });

    expect(result.current.step).toBe('choose');
    expect(result.current.entry).toBe('');
  });

  it('holds its state through the closing frame, so the dots do not clear mid-dismissal', async () => {
    const { result, rerender } = render();

    await type(result, '1234');
    await type(result, '56');
    rerender({ isOpen: false });

    expect(result.current.step).toBe('confirm');
    expect(result.current.entry).toBe('56');
  });

  it('keeps a half-typed confirmation while the dialog stays open', async () => {
    const { result, rerender } = render();

    await type(result, '1234');
    await type(result, '56');
    rerender({ isOpen: true });

    expect(result.current.step).toBe('confirm');
    expect(result.current.entry).toBe('56');
  });

  it('backspaces the last digit', async () => {
    const { result } = render();

    await type(result, '12');
    act(() => result.current.backspace());

    expect(result.current.entry).toBe('1');
  });
});
