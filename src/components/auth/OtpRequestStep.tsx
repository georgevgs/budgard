import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import FormSubmitButton from '@/components/ui/form-submit-button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type Props = {
  formAction: (formData: FormData) => void;
  error: string | null;
  initialEmail: string;
  turnstileToken: string | null;
  onTokenChange: (token: string | null) => void;
  turnstileRef: RefObject<TurnstileInstance | null>;
};

const OtpRequestStep = ({
  formAction,
  error,
  initialEmail,
  turnstileToken,
  onTokenChange,
  turnstileRef,
}: Props) => {
  const { isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Input
            name="email"
            type="email"
            defaultValue={initialEmail}
            placeholder={t('auth.enterEmail')}
            className={cn('w-full h-10', error && 'border-destructive')}
            disabled={isAuthLoading}
            autoComplete="email"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label={t('auth.enterEmail')}
            aria-invalid={!!error}
            aria-describedby={getErrorDescribedBy(error)}
          />
          {renderEmailError(error)}

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
};

export default OtpRequestStep;

// ─── Helper render functions ──────────────────────────────────────────────────

const getErrorDescribedBy = (error: string | null): string | undefined => {
  if (error) {
    return 'email-error';
  }

  return undefined;
};

const renderEmailError = (error: string | null) => {
  if (!error) return null;

  return (
    <p id="email-error" className="text-sm text-destructive">
      {error}
    </p>
  );
};
