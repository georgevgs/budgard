import { useOtpAction } from '@/pages/landing/hooks/useOtpAction';
import { OtpRequestStep } from '@/pages/landing/components/OtpRequestStep';
import { OtpVerifyStep } from '@/pages/landing/components/OtpVerifyStep';

type OtpFormProps = {
  onSuccess?: () => void;
};

export const OtpForm = ({ onSuccess }: OtpFormProps) => {
  const otpFlow = useOtpAction(onSuccess);

  if (otpFlow.state.step === 'request') {
    return (
      <OtpRequestStep
        formAction={otpFlow.formAction}
        error={otpFlow.state.error}
        initialEmail={otpFlow.state.email}
        turnstileToken={otpFlow.turnstileToken}
        onTokenChange={otpFlow.setTurnstileToken}
        turnstileRef={otpFlow.turnstileRef}
      />
    );
  }

  return (
    <OtpVerifyStep
      formAction={otpFlow.formAction}
      email={otpFlow.state.email}
      error={otpFlow.state.error}
      otp={otpFlow.otp}
      onOtpChange={otpFlow.setOtp}
      lastSentAt={otpFlow.state.lastSentAt}
      turnstileToken={otpFlow.turnstileToken}
      onTokenChange={otpFlow.setTurnstileToken}
      turnstileRef={otpFlow.turnstileRef}
    />
  );
};
