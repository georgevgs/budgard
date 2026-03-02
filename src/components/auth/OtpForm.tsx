import { useActionState, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { signInWithOTP, requestOTP } from '@/lib/auth';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { emailSchema } from '@/lib/validations';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useTranslation } from 'react-i18next';
import FormSubmitButton from '@/components/ui/form-submit-button';

type OtpFormProps = {
  onSuccess?: () => void;
};

type OtpState = {
  step: 'request' | 'verify';
  email: string;
  error: string | null;
};

const initialState: OtpState = { step: 'request', email: '', error: null };

const OtpForm = ({ onSuccess }: OtpFormProps) => {
  const { isLoading: isAuthLoading } = useAuth();
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

        const { error } = await requestOTP(email);
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
        return { step: 'verify', email: prev.email, error: t('auth.invalidCode') };
      }

      toast({ title: t('common.success'), description: t('auth.signedIn') });
      onSuccess?.();
      return { step: 'verify', email: prev.email, error: null };
    },
    initialState,
  );

  if (state.step === 'request') {
    return (
      <div className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Input
              name="email"
              type="email"
              placeholder={t('auth.enterEmail')}
              className={`w-full h-10 ${state.error ? 'border-destructive' : ''}`}
              disabled={isAuthLoading}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={t('auth.enterEmail')}
              aria-invalid={!!state.error}
              aria-describedby={state.error ? 'email-error' : undefined}
            />
            {state.error && (
              <p id="email-error" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            {/* Honeypot field — visually hidden text input for bot detection */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                pointerEvents: 'none',
                height: 0,
                width: 0,
                overflow: 'hidden',
              }}
            >
              <label>
                Leave this field empty:
                <input
                  name="phone_number"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>
          </div>

          {/* Turnstile token synced to a hidden input so the action can read it */}
          <input
            type="hidden"
            name="turnstile_token"
            value={turnstileToken ?? ''}
          />

          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: 'auto', size: 'normal' }}
            />
          </div>

          <FormSubmitButton
            className="w-full h-10"
            pendingText={t('auth.sending')}
            disabled={isAuthLoading || !turnstileToken}
          >
            {t('auth.sendCode')}
          </FormSubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 mb-4">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <p className="text-muted-foreground text-sm text-center px-4">
          {t('auth.codeEmailSent', { email: state.email })}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="otp" value={otp} />

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={isAuthLoading}
            inputMode="numeric"
            pattern="[0-9]*"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {state.error && (
          <p className="text-sm text-destructive text-center">{state.error}</p>
        )}

        <div className="space-y-2">
          <FormSubmitButton
            className="w-full h-10"
            pendingText={t('auth.verifying')}
            disabled={isAuthLoading || otp.length !== 6}
          >
            {t('auth.verifyCode')}
          </FormSubmitButton>
        </div>
      </form>

      {/* Separate form to submit the back action */}
      <form action={formAction}>
        <input type="hidden" name="_action" value="back" />
        <Button
          type="submit"
          variant="ghost"
          className="w-full h-10"
          disabled={isAuthLoading}
        >
          {t('auth.useDifferentEmail')}
        </Button>
      </form>
    </div>
  );
};

export default OtpForm;
