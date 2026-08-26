import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAmountPad } from '@/hooks/expenseForm/useAmountPad';

const type = (
  pad: { current: ReturnType<typeof useAmountPad> },
  digits: string,
) => {
  for (const digit of digits) {
    act(() => pad.current.press(Number(digit)));
  }
};

describe('useAmountPad', () => {
  it('fills from the right so the decimal places itself', () => {
    const { result } = renderHook(() => useAmountPad());

    type(result, '1280');

    expect(result.current.cents).toBe(1280);
    expect(result.current.amount).toBe(12.8);
  });

  it('treats the first digits as cents', () => {
    const { result } = renderHook(() => useAmountPad());

    type(result, '5');

    expect(result.current.amount).toBe(0.05);
  });

  it('backspaces one digit at a time', () => {
    const { result } = renderHook(() => useAmountPad());

    type(result, '1280');
    act(() => result.current.backspace());

    expect(result.current.cents).toBe(128);
  });

  it('is empty at zero, so Save can stay disabled', () => {
    const { result } = renderHook(() => useAmountPad());

    expect(result.current.isEmpty).toBe(true);
    type(result, '0');
    expect(result.current.isEmpty).toBe(true);
    type(result, '1');
    expect(result.current.isEmpty).toBe(false);
  });

  // The schema rejects anything over 1,000,000, so the pad refuses the digit
  // rather than letting the form fail after the fact.
  it('stops at the amount the schema allows', () => {
    const { result } = renderHook(() => useAmountPad());

    type(result, '1000000000');

    expect(result.current.amount).toBeLessThanOrEqual(1_000_000);
    expect(result.current.cents).toBe(100_000_000);
  });

  it('clears back to nothing', () => {
    const { result } = renderHook(() => useAmountPad());

    type(result, '4242');
    act(() => result.current.clear());

    expect(result.current.cents).toBe(0);
  });

  it('accepts a parsed amount without replaying keypad digits', () => {
    const { result } = renderHook(() => useAmountPad());

    act(() => result.current.setAmount(12.8));

    expect(result.current.cents).toBe(1280);
    expect(result.current.amount).toBe(12.8);
  });

  it('rejects parsed amounts above the form limit', () => {
    const { result } = renderHook(() => useAmountPad());

    act(() => result.current.setAmount(1_000_000.01));

    expect(result.current.cents).toBe(0);
  });
});
