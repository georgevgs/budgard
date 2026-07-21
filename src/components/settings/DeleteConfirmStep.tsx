import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Props = {
  email: string;
  turnstileRef: RefObject<TurnstileInstance | null>;
  turnstileToken: string | null;
  onTokenChange: (token: string | null) => void;
  error: string | null;
  isSending: boolean;
  onSendCode: () => void;
};

const DeleteConfirmStep = ({
  email,
  turnstileRef,
  turnstileToken,
  onTokenChange,
  error,
  isSending,
  onSendCode,
}: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialogHeader data-draggable-area>
        <AlertDialogTitle>
          {t('settings.data.deleteAccountConfirmTitle')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t('settings.data.deleteAccountConfirmDescription')}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <p className="text-sm text-muted-foreground">
        {t('settings.data.deleteAccountCodeNotice', { email })}
      </p>

      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          onSuccess={onTokenChange}
          onError={() => onTokenChange(null)}
          onExpire={() => onTokenChange(null)}
          options={{ theme: 'auto', size: 'normal' }}
        />
      </div>

      {renderError(error)}

      <AlertDialogFooter>
        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={onSendCode}
          disabled={isSending || !turnstileToken}
        >
          {resolveConfirmLabel(isSending, t)}
        </Button>
      </AlertDialogFooter>
    </>
  );
};

export default DeleteConfirmStep;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const resolveConfirmLabel = (isSending: boolean, t: TFunc): string => {
  if (isSending) {
    return t('auth.sending');
  }

  return t('settings.data.deleteAccountConfirmButton');
};

const renderError = (error: string | null) => {
  if (!error) return null;

  return (
    <p className="text-sm text-destructive text-center" role="alert">
      {error}
    </p>
  );
};
