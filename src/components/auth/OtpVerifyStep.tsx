import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import FormSubmitButton from '@/components/ui/form-submit-button';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  formAction: (formData: FormData) => void;
  email: string;
  error: string | null;
  otp: string;
  onOtpChange: (otp: string) => void;
};

const OtpVerifyStep = ({ formAction, email, error, otp, onOtpChange }: Props) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 mb-4">
        <CheckCircle2 className="h-8 w-8 text-primary" />
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

const renderOtpError = (error: string | null) => {
  if (!error) return null;

  return (
    <p id="otp-error" className="text-sm text-destructive text-center" role="alert">
      {error}
    </p>
  );
};
