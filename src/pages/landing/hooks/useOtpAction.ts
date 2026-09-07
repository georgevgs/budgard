import { useActionState, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useToast, type ToastParams } from '@/common/hooks/useToast';
import { authApi } from '@/common/api/authApi';
import { emailSchema } from '@/constants/validations';
import type { TranslateFunction } from '@/constants/translate';

export type OtpState = {
  step: 'request' | 'verify';
  email: string;
  error: string | null;
  lastSentAt: number | null;
};

const initialState: OtpState = {
  step: 'request',
  email: '',
  error: null,
  lastSentAt: null,
};

export const useOtpAction = (onSuccess?: () => void) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [otp, setOtp] = useState('');

  const [state, formAction] = useActionState(
    async (prev: OtpState, formData: FormData): Promise<OtpState> => {
      const effects: OtpEffects = {
        t,
        toast,
        setOtp,
        clearCaptchaToken: () => setTurnstileToken(null),
        resetCaptcha: () => {
          turnstileRef.current?.reset();
          setTurnstileToken(null);
        },
        onSuccess,
      };
      const action = formData.get('_action');

      if (action === 'back') {
        return goBack(prev, effects);
      }

      if (action === 'resend') {
        return resendCode(prev, formData, effects);
      }

      if (prev.step === 'request') {
        return requestCode(formData, effects);
      }

      return verifyCode(prev, formData, effects);
    },
    initialState,
  );

  return {
    state,
    formAction,
    otp,
    setOtp,
    turnstileToken,
    setTurnstileToken,
    turnstileRef,
  };
};

// The four flows below are pure of React: they take what they need to do and
// return the next state. Everything that reaches outside — the toast, the OTP
// field, the captcha widget — arrives as a callback, which is what lets each
// one be read (and tested) on its own.
type OtpEffects = {
  t: TranslateFunction;
  toast: (params: ToastParams) => void;
  setOtp: (value: string) => void;
  // A Turnstile token is single-use. A consumed one only needs clearing,
  // because the next step mounts a fresh widget; a *failed* send leaves the
  // mounted widget holding a spent token and has to reset it as well.
  clearCaptchaToken: () => void;
  resetCaptcha: () => void;
  onSuccess?: () => void;
};

// Keep the email so the user edits it instead of retyping from scratch.
const goBack = (prev: OtpState, effects: OtpEffects): OtpState => {
  effects.setOtp('');

  return {
    step: 'request',
    email: prev.email,
    error: null,
    lastSentAt: null,
  };
};

const requestCode = async (
  formData: FormData,
  effects: OtpEffects,
): Promise<OtpState> => {
  // Honeypot — silently fail, so a bot learns nothing about being detected.
  if (formData.get('phone_number')) {
    return { ...initialState };
  }

  const captchaToken = formData.get('turnstile_token') as string;
  if (!captchaToken) {
    return rejectedRequest(effects.t('auth.securityCheck'));
  }

  const email = formData.get('email') as string;
  if (!isValidEmail(email)) {
    return rejectedRequest(effects.t('auth.invalidEmail'));
  }

  const { error } = await authApi.requestOTP(email, captchaToken);
  if (error) {
    effects.resetCaptcha();

    return rejectedRequest(effects.t('auth.sendFailed'));
  }

  effects.clearCaptchaToken();
  effects.toast({
    title: effects.t('auth.codeSent'),
    description: effects.t('auth.checkEmail'),
  });

  return { step: 'verify', email, error: null, lastSentAt: Date.now() };
};

const verifyCode = async (
  prev: OtpState,
  formData: FormData,
  effects: OtpEffects,
): Promise<OtpState> => {
  const email = formData.get('email') as string;
  const otpValue = formData.get('otp') as string;

  const { error } = await authApi.signInWithOTP(email, otpValue);
  if (error) {
    // Clear the stale code so the user can type the next attempt directly.
    effects.setOtp('');

    return { ...prev, error: effects.t('auth.invalidCode') };
  }

  effects.toast({
    title: effects.t('common.success'),
    description: effects.t('auth.signedIn'),
  });
  effects.onSuccess?.();

  return { ...prev, error: null };
};

const resendCode = async (
  prev: OtpState,
  formData: FormData,
  effects: OtpEffects,
): Promise<OtpState> => {
  const captchaToken = formData.get('turnstile_token') as string;
  if (!captchaToken) {
    return { ...prev, error: effects.t('auth.securityCheck') };
  }

  const { error } = await authApi.requestOTP(prev.email, captchaToken);
  effects.resetCaptcha();
  if (error) {
    return { ...prev, error: effects.t('auth.sendFailed') };
  }

  effects.setOtp('');
  effects.toast({
    title: effects.t('auth.codeSent'),
    description: effects.t('auth.checkEmail'),
  });

  return { ...prev, error: null, lastSentAt: Date.now() };
};

// A rejected request clears the email along with the step: the form comes back
// empty rather than half-filled with an address that did not work.
const rejectedRequest = (error: string): OtpState => {
  return { step: 'request', email: '', error, lastSentAt: null };
};

const isValidEmail = (value: string): boolean => {
  try {
    emailSchema.parse(value);

    return true;
  } catch {
    return false;
  }
};
