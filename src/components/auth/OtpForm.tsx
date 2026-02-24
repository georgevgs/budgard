import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { signInWithOTP, requestOTP } from '@/lib/auth';
import { CheckCircle2 } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { emailSchema } from '@/lib/validations';
import { useNavigate } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useTranslation } from 'react-i18next';

type OtpFormProps = {
  onSuccess?: () => void;
};

const OtpForm = ({ onSuccess }: OtpFormProps) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Honeypot field
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const { toast } = useToast();
  const { isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isAuthLoading) return;

    // Check honeypot
    if (honeypot) {
      // Silently fail to avoid letting bots know they were detected
      navigate('/');
      return;
    }

    // Verify Turnstile token exists
    if (!turnstileToken) {
      toast({
        title: t('auth.verificationRequired'),
        description: t('auth.securityCheck'),
        variant: 'destructive',
      });
      return;
    }

    try {
      emailSchema.parse(email);
      setEmailError('');
    } catch (error) {
      setEmailError((error as Error).message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await requestOTP(email);
      if (error) throw error;

      setOtpSent(true);
      toast({
        title: t('auth.codeSent'),
        description: t('auth.checkEmail'),
      });
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.sendFailed'),
        variant: 'destructive',
      });
      // Reset Turnstile on error so user can try again
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isAuthLoading || otp.length !== 6) return;

    setLoading(true);
    try {
      const { error } = await signInWithOTP(email, otp);
      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('auth.signedIn'),
      });
      onSuccess?.();
    } catch {
      toast({
        title: t('common.error'),
        description: t('auth.invalidCode'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!otpSent) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleRequestOTP} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={t('auth.enterEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full h-10 ${emailError ? 'border-destructive' : ''}`}
              disabled={loading || isAuthLoading}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label={t('auth.enterEmail')}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive">
                {emailError}
              </p>
            )}

            {/* Honeypot field */}
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
                <Input
                  name="phone_number" // Deceptive name to trick bots
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>
          </div>

          {/* Cloudflare Turnstile */}
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{
                theme: 'auto',
                size: 'normal',
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-10"
            disabled={loading || isAuthLoading || !turnstileToken}
          >
            {loading ? t('auth.sending') : t('auth.sendCode')}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2 mb-4">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <p className="text-muted-foreground text-sm text-center px-4">
          {t('auth.codeEmailSent', { email })}
        </p>
      </div>

      <form onSubmit={handleVerifyOTP} className="space-y-4">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={loading || isAuthLoading}
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

        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full h-10"
            disabled={loading || isAuthLoading || otp.length !== 6}
          >
            {loading ? t('auth.verifying') : t('auth.verifyCode')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full h-10"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
            }}
            disabled={loading || isAuthLoading}
          >
            {t('auth.useDifferentEmail')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OtpForm;
