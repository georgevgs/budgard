import { useActionState, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useToast } from '@/hooks/useToast';
import { signInWithOTP, requestOTP } from '@/lib/auth';
import { emailSchema } from '@/lib/validations';

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
      // Handle go-back action — keep the email so the user edits it
      // instead of retyping from scratch
      if (formData.get('_action') === 'back') {
        setOtp('');

        return {
          step: 'request',
          email: prev.email,
          error: null,
          lastSentAt: null,
        };
      }

      // Handle re-send action from the verify step
      if (formData.get('_action') === 'resend') {
        const captchaToken = formData.get('turnstile_token') as string;
        if (!captchaToken) {
          return { ...prev, error: t('auth.securityCheck') };
        }

        const { error } = await requestOTP(prev.email, captchaToken);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        if (error) {
          return { ...prev, error: t('auth.sendFailed') };
        }

        setOtp('');
        toast({
          title: t('auth.codeSent'),
          description: t('auth.checkEmail'),
        });

        return { ...prev, error: null, lastSentAt: Date.now() };
      }

      // Step: request OTP
      if (prev.step === 'request') {
        // Honeypot check — silently fail to avoid revealing detection
        if (formData.get('phone_number')) {
          return { ...initialState };
        }

        const token = formData.get('turnstile_token') as string;
        if (!token) {
          return {
            step: 'request',
            email: '',
            error: t('auth.securityCheck'),
            lastSentAt: null,
          };
        }

        const email = formData.get('email') as string;
        try {
          emailSchema.parse(email);
        } catch {
          return {
            step: 'request',
            email: '',
            error: t('auth.invalidEmail'),
            lastSentAt: null,
          };
        }

        const captchaToken = formData.get('turnstile_token') as string;
        const { error } = await requestOTP(email, captchaToken || undefined);
        if (error) {
          turnstileRef.current?.reset();
          setTurnstileToken(null);

          return {
            step: 'request',
            email: '',
            error: t('auth.sendFailed'),
            lastSentAt: null,
          };
        }

        // The token was consumed by the send — the verify step mounts a fresh
        // widget for a potential re-send
        setTurnstileToken(null);

        toast({
          title: t('auth.codeSent'),
          description: t('auth.checkEmail'),
        });

        return { step: 'verify', email, error: null, lastSentAt: Date.now() };
      }

      // Step: verify OTP
      const email = formData.get('email') as string;
      const otpValue = formData.get('otp') as string;

      const { error } = await signInWithOTP(email, otpValue);
      if (error) {
        // Clear the stale code so the user can type the next attempt directly
        setOtp('');

        return { ...prev, error: t('auth.invalidCode') };
      }

      toast({ title: t('common.success'), description: t('auth.signedIn') });
      onSuccess?.();

      return { ...prev, error: null };
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
