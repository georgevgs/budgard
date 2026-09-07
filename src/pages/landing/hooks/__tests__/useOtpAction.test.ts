import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startTransition } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOtpAction } from '@/pages/landing/hooks/useOtpAction';

const mockRequestOTP = vi.fn();
const mockSignInWithOTP = vi.fn();
vi.mock('@/common/api/authApi', () => ({
  authApi: {
    requestOTP: (...args: unknown[]) => mockRequestOTP(...args),
    signInWithOTP: (...args: unknown[]) => mockSignInWithOTP(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// The global react-i18next mock returns the key, so an assertion on `error`
// reads as the i18n key the flow chose.
const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.append(key, value));

  return data;
};

const submit = async (
  result: { current: ReturnType<typeof useOtpAction> },
  fields: Record<string, string>,
): Promise<void> => {
  await act(async () => {
    startTransition(() => {
      result.current.formAction(form(fields));
    });
  });
};

// Drives the request step to completion so a test can start from `verify`.
const reachVerifyStep = async (result: {
  current: ReturnType<typeof useOtpAction>;
}): Promise<void> => {
  mockRequestOTP.mockResolvedValueOnce({ error: null });
  await submit(result, {
    email: 'george@example.com',
    turnstile_token: 'tok',
  });
};

describe('useOtpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the request step', () => {
    it('moves to verify and keeps the email once the code is sent', async () => {
      const { result } = renderHook(() => useOtpAction());

      mockRequestOTP.mockResolvedValueOnce({ error: null });
      await submit(result, {
        email: 'george@example.com',
        turnstile_token: 'tok',
      });

      expect(mockRequestOTP).toHaveBeenCalledWith('george@example.com', 'tok');
      expect(result.current.state.step).toBe('verify');
      expect(result.current.state.email).toBe('george@example.com');
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.lastSentAt).toEqual(expect.any(Number));
    });

    // The honeypot must not tell a bot it was detected, so this returns the
    // pristine state rather than an error — and sends nothing.
    it('swallows a submission that filled the honeypot', async () => {
      const { result } = renderHook(() => useOtpAction());

      await submit(result, {
        email: 'bot@example.com',
        turnstile_token: 'tok',
        phone_number: '+30 555',
      });

      expect(mockRequestOTP).not.toHaveBeenCalled();
      expect(result.current.state.step).toBe('request');
      expect(result.current.state.error).toBeNull();
    });

    it('refuses to send without a captcha token', async () => {
      const { result } = renderHook(() => useOtpAction());

      await submit(result, { email: 'george@example.com' });

      expect(mockRequestOTP).not.toHaveBeenCalled();
      expect(result.current.state.error).toBe('auth.securityCheck');
    });

    it('refuses to send to an address that is not an email', async () => {
      const { result } = renderHook(() => useOtpAction());

      await submit(result, { email: 'not-an-email', turnstile_token: 'tok' });

      expect(mockRequestOTP).not.toHaveBeenCalled();
      expect(result.current.state.error).toBe('auth.invalidEmail');
    });

    it('reports a send failure and stays on the request step', async () => {
      const { result } = renderHook(() => useOtpAction());

      mockRequestOTP.mockResolvedValueOnce({ error: new Error('nope') });
      await submit(result, {
        email: 'george@example.com',
        turnstile_token: 'tok',
      });

      expect(result.current.state.step).toBe('request');
      expect(result.current.state.error).toBe('auth.sendFailed');
    });
  });

  describe('the verify step', () => {
    it('signs in and calls onSuccess with a good code', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useOtpAction(onSuccess));
      await reachVerifyStep(result);

      mockSignInWithOTP.mockResolvedValueOnce({ error: null });
      await submit(result, { email: 'george@example.com', otp: '123456' });

      expect(mockSignInWithOTP).toHaveBeenCalledWith(
        'george@example.com',
        '123456',
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.state.error).toBeNull();
    });

    it('reports a bad code without leaving the verify step', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useOtpAction(onSuccess));
      await reachVerifyStep(result);

      mockSignInWithOTP.mockResolvedValueOnce({ error: new Error('bad') });
      await submit(result, { email: 'george@example.com', otp: '000000' });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.state.step).toBe('verify');
      expect(result.current.state.error).toBe('auth.invalidCode');
    });
  });

  describe('the resend action', () => {
    it('sends again to the address already captured', async () => {
      const { result } = renderHook(() => useOtpAction());
      await reachVerifyStep(result);
      const firstSentAt = result.current.state.lastSentAt;
      vi.advanceTimersByTime(1000);

      mockRequestOTP.mockResolvedValueOnce({ error: null });
      await submit(result, { _action: 'resend', turnstile_token: 'tok2' });

      expect(mockRequestOTP).toHaveBeenLastCalledWith(
        'george@example.com',
        'tok2',
      );
      expect(result.current.state.step).toBe('verify');
      expect(result.current.state.lastSentAt).not.toBe(firstSentAt);
    });

    it('refuses to resend without a fresh captcha token', async () => {
      const { result } = renderHook(() => useOtpAction());
      await reachVerifyStep(result);
      mockRequestOTP.mockClear();

      await submit(result, { _action: 'resend' });

      expect(mockRequestOTP).not.toHaveBeenCalled();
      expect(result.current.state.error).toBe('auth.securityCheck');
    });

    it('reports a resend failure', async () => {
      const { result } = renderHook(() => useOtpAction());
      await reachVerifyStep(result);

      mockRequestOTP.mockResolvedValueOnce({ error: new Error('nope') });
      await submit(result, { _action: 'resend', turnstile_token: 'tok2' });

      expect(result.current.state.error).toBe('auth.sendFailed');
    });
  });

  describe('the back action', () => {
    it('returns to the request step with the email still filled in', async () => {
      const { result } = renderHook(() => useOtpAction());
      await reachVerifyStep(result);

      await submit(result, { _action: 'back' });

      expect(result.current.state.step).toBe('request');
      expect(result.current.state.email).toBe('george@example.com');
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.lastSentAt).toBeNull();
    });
  });
});
