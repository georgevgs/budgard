import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { formatCurrency } from '@/lib/utils';

type Props = {
  amount: number;
  currency: string;
};

// The headline number counts up on arrival, which makes the hero feel like it
// settled rather than snapped. useAnimatedNumber holds the reduced-motion
// exemption, so this is safe to use everywhere.
//
// `amount` is signed: a negative safe-to-spend is a real state (you are past
// the plan) and must not be flattened to its magnitude, or the headline reads
// identically whether it is headroom or overspend.
const TodayAmount = ({ amount, currency }: Props) => {
  const displayed = useAnimatedNumber(amount);

  return (
    <p className="text-[2.65rem] font-bold leading-none tracking-[-0.05em] tabular-nums sm:text-5xl">
      {renderSign(displayed)}
      {formatCurrency(Math.abs(displayed), currency)}
    </p>
  );
};

export default TodayAmount;

// --- Helpers ---

// U+2212 with an absolute value, matching every other signed amount in the app
// (ActivitySummary, ActivityFeed, AccountCard). formatCurrency would emit a
// de-DE ASCII hyphen instead, which reads narrower and sits differently.
const renderSign = (displayed: number) => {
  if (displayed >= 0) {
    return null;
  }

  return '−';
};
