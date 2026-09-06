import { cn } from '@/constants/utils';
import type { Insight } from '@/common/hooks/useSpendingInsights';

interface Props {
  icon: Insight['icon'];
  className?: string;
}

// Every insight uses the same foreground SVG treatment. The sentence carries
// the meaning; changing glyph colour by variant made the same insight look
// different between Today and Trends.
const InsightIcon = ({ icon: Icon, className }: Props) => {
  return (
    <Icon
      className={cn('shrink-0 text-foreground', className)}
      aria-hidden="true"
    />
  );
};

export default InsightIcon;
