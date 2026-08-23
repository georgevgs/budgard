import { cn } from '@/lib/utils';
import type { Insight } from '@/hooks/useSpendingInsights';

type Props = {
  variant: Insight['variant'];
  icon: Insight['icon'];
  className?: string;
};

// An insight's variant, carried by the ink of one glyph and by nothing else.
//
// It used to be carried twice over, differently in each of the two places an
// insight is drawn: Today put a SOLID disc behind the icon — a green circle on
// a peach tile, two hues on one small module — and Trends tinted the entire
// card by variant, `bg-income/10` with a matching border, which is a mint-green
// wash on a white page and the one thing the palette rules out by name.
//
// The variant is real information: "you are on track" and "you are spending
// fast" are not the same observation. But it is one glyph's worth of
// information, and an ink is what the three-role rule has for exactly this —
// a hue drawn as text, straight onto the surface, with no fill under it.
const InsightIcon = ({ variant, icon: Icon, className }: Props) => {
  return (
    <Icon className={cn('shrink-0', getInkClassName(variant), className)} />
  );
};

export default InsightIcon;

// --- Helpers ---

const getInkClassName = (variant: Insight['variant']): string => {
  if (variant === 'positive') {
    return 'text-income-ink';
  }
  if (variant === 'warning') {
    return 'text-warning-ink';
  }

  return 'text-primary-ink';
};
