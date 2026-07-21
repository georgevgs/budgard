import { useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import DeleteConfirmStep from '@/components/settings/DeleteConfirmStep';
import DeleteVerifyStep from '@/components/settings/DeleteVerifyStep';
import { useAuth } from '@/contexts/AuthContext';
import { requestOTP, signInWithOTP } from '@/lib/auth';

// Deleting an account is irreversible, so the server requires a session whose
// last authentication is recent (amr check in the delete-account function).
// This dialog re-verifies the user with a fresh email OTP before deleting.

type Step = 'confirm' | 'verify';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
};

const DeleteAccountDialog = ({
  open,
  onOpenChange,
  onConfirmDelete,
  isDeleting,
}: Props) => {
  const { session } = useAuth();
  const { t } = useTranslation();
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [step, setStep] = useState<Step>('confirm');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const email = session?.user?.email ?? '';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('confirm');
      setOtp('');
      setError(null);
      setTurnstileToken(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSendCode = async () => {
    setIsSending(true);
    setError(null);
    const { error: sendError } = await requestOTP(
      email,
      turnstileToken ?? undefined,
    );
    setIsSending(false);
    if (sendError) {
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setError(t('auth.sendFailed'));

      return;
    }

    setStep('verify');
  };

  const handleVerifyAndDelete = async () => {
    setIsVerifying(true);
    setError(null);
    const { error: verifyError } = await signInWithOTP(email, otp);
    if (verifyError) {
      setIsVerifying(false);
      setOtp('');
      setError(t('auth.invalidCode'));

      return;
    }

    await onConfirmDelete();
    setIsVerifying(false);
    handleOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="sm:max-w-[425px]"
        onOpenChange={handleOpenChange}
      >
        {renderStep({
          step,
          email,
          turnstileRef,
          turnstileToken,
          onTokenChange: setTurnstileToken,
          error,
          isSending,
          onSendCode: handleSendCode,
          otp,
          onOtpChange: setOtp,
          isBusy: isVerifying || isDeleting,
          onVerifyAndDelete: handleVerifyAndDelete,
        })}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;

// --- Helpers ---

type StepRenderArgs = {
  step: Step;
  email: string;
  turnstileRef: RefObject<TurnstileInstance | null>;
  turnstileToken: string | null;
  onTokenChange: (token: string | null) => void;
  error: string | null;
  isSending: boolean;
  onSendCode: () => void;
  otp: string;
  onOtpChange: (otp: string) => void;
  isBusy: boolean;
  onVerifyAndDelete: () => void;
};

const renderStep = (args: StepRenderArgs) => {
  if (args.step === 'confirm') {
    return (
      <DeleteConfirmStep
        email={args.email}
        turnstileRef={args.turnstileRef}
        turnstileToken={args.turnstileToken}
        onTokenChange={args.onTokenChange}
        error={args.error}
        isSending={args.isSending}
        onSendCode={args.onSendCode}
      />
    );
  }

  return (
    <DeleteVerifyStep
      email={args.email}
      otp={args.otp}
      onOtpChange={args.onOtpChange}
      error={args.error}
      isDeleting={args.isBusy}
      onVerifyAndDelete={args.onVerifyAndDelete}
    />
  );
};
