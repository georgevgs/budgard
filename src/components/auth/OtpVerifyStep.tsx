import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import FormSubmitButton from '@/components/ui/form-submit-button';
import { useAuth } from '@/contexts/AuthContext';
import { useResendCooldown } from '@/hooks/auth/useResendCooldown';

type Props = {
  formAction: (formData: FormData) => void;
  email: string;
  error: string | null;
  otp: string;
  onOtpChange: (otp: string) => void;
  lastSentAt: number | null;
  turnstileToken: string | null;
  onTokenChange: (token: string | null) => void;
  turnstileRef: RefObject<TurnstileInstance | null>;
};

const OtpVerifyStep = ({
  formAction,
  email,
  error,
  otp,
  onOtpChange,
  lastSentAt,
  turnstileToken,
  onTokenChange,
  turnstileRef,
}: Props) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const cooldownSeconds = useResendCooldown(lastSentAt);

  const isResendDisabled =
    isAuthLoading || cooldownSeconds > 0 || !turnstileToken;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 mb-4">
        <CheckCircle2 className="h-8 w-8 text-primary-ink" />
        <p className="text-muted-foreground text-sm text-center px-4">
          {t('auth.codeEmailSent', { email })}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="otp" value={otp} />

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={onOtpChange}
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

        {renderOtpError(error)}

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

      {/* Separate form to re-send the code to the same email */}
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="_action" value="resend" />
        <input
          type="hidden"
          name="turnstile_token"
          value={turnstileToken ?? ''}
        />
        {renderResendCaptcha(turnstileRef, onTokenChange)}
        <Button
          type="submit"
          variant="ghost"
          className="w-full h-10"
          disabled={isResendDisabled}
        >
          {getResendLabel(cooldownSeconds, t)}
        </Button>
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

export default OtpVerifyStep;

// ─── Helper render functions ──────────────────────────────────────────────────

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderOtpError = (error: string | null) => {
  if (!error) return null;

  return (
    <p
      id="otp-error"
      className="text-sm text-destructive-ink text-center"
      role="alert"
    >
      {error}
    </p>
  );
};

// A re-send consumes a fresh captcha token, so the verify step keeps its own
// Turnstile widget alive — the request step's widget unmounted with that step.
const renderResendCaptcha = (
  turnstileRef: RefObject<TurnstileInstance | null>,
  onTokenChange: (token: string | null) => void,
) => (
  <div className="flex w-full justify-center">
    <Turnstile
      ref={turnstileRef}
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
      onSuccess={onTokenChange}
      onError={() => onTokenChange(null)}
      onExpire={() => onTokenChange(null)}
      options={{ theme: 'auto', size: 'flexible' }}
    />
  </div>
);

const getResendLabel = (
  cooldownSeconds: number,
  t: TranslateFunction,
): string => {
  if (cooldownSeconds > 0) {
    return t('auth.resendCodeIn', { seconds: cooldownSeconds });
  }

  return t('auth.resendCode');
};
