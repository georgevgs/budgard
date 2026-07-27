import { useOtpAction } from '@/hooks/auth/useOtpAction';
import OtpRequestStep from '@/components/auth/OtpRequestStep';
import OtpVerifyStep from '@/components/auth/OtpVerifyStep';

type OtpFormProps = {
  onSuccess?: () => void;
};

const OtpForm = ({ onSuccess }: OtpFormProps) => {
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

export default OtpForm;
