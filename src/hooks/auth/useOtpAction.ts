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
};

const initialState: OtpState = { step: 'request', email: '', error: null };

export const useOtpAction = (onSuccess?: () => void) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [otp, setOtp] = useState('');

  const [state, formAction] = useActionState(
    async (prev: OtpState, formData: FormData): Promise<OtpState> => {
      // Handle go-back action
      if (formData.get('_action') === 'back') {
        setOtp('');

        return { ...initialState };
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
          };
        }

        const captchaToken = formData.get('turnstile_token') as string;
        const { error } = await requestOTP(email, captchaToken || undefined);
        if (error) {
          turnstileRef.current?.reset();
          setTurnstileToken(null);

          return { step: 'request', email: '', error: t('auth.sendFailed') };
        }

        toast({
          title: t('auth.codeSent'),
          description: t('auth.checkEmail'),
        });

        return { step: 'verify', email, error: null };
      }

      // Step: verify OTP
      const email = formData.get('email') as string;
      const otpValue = formData.get('otp') as string;

      const { error } = await signInWithOTP(email, otpValue);
      if (error) {
        return {
          step: 'verify',
          email: prev.email,
          error: t('auth.invalidCode'),
        };
      }

      toast({ title: t('common.success'), description: t('auth.signedIn') });
      onSuccess?.();

      return { step: 'verify', email: prev.email, error: null };
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
