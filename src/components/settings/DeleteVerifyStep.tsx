import { useTranslation } from 'react-i18next';
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

type Props = {
  email: string;
  otp: string;
  onOtpChange: (otp: string) => void;
  error: string | null;
  isDeleting: boolean;
  onVerifyAndDelete: () => void;
};

const DeleteVerifyStep = ({
  email,
  otp,
  onOtpChange,
  error,
  isDeleting,
  onVerifyAndDelete,
}: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialogHeader data-draggable-area>
        <AlertDialogTitle>
          {t('settings.data.deleteAccountVerifyTitle')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t('auth.codeEmailSent', { email })}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={onOtpChange}
          disabled={isDeleting}
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

      {renderError(error)}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>
          {t('common.cancel')}
        </AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={onVerifyAndDelete}
          disabled={isDeleting || otp.length !== 6}
        >
          {resolveVerifyLabel(isDeleting, t)}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

export default DeleteVerifyStep;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const resolveVerifyLabel = (isDeleting: boolean, t: TFunc): string => {
  if (isDeleting) {
    return t('auth.verifying');
  }

  return t('settings.data.deleteAccountVerifyButton');
};

const renderError = (error: string | null) => {
  if (!error) return null;

  return (
    <p className="text-sm text-destructive-ink text-center" role="alert">
      {error}
    </p>
  );
};
