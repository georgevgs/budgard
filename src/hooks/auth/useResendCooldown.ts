import { useEffect, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 60;

// Countdown gate for OTP re-sends. Restarts whenever `lastSentAt` changes
// (a code was just sent) and ticks down to zero once per second.
export const useResendCooldown = (lastSentAt: number | null): number => {
  const [cooldownSeconds, setCooldownSeconds] = useState(
    RESEND_COOLDOWN_SECONDS,
  );
  const [prevSentAt, setPrevSentAt] = useState(lastSentAt);

  // A new send restarts the countdown; adjusted during render so the reset
  // is visible before the interval effect re-arms.
  if (lastSentAt !== prevSentAt) {
    setPrevSentAt(lastSentAt);
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCooldownSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lastSentAt]);

  return cooldownSeconds;
};
