import { InsightIcon } from '@/common/components/common/InsightIcon';
import type { Insight } from '@/common/hooks/useSpendingInsights';
import { BentoTile } from '@/common/components/bento';

type InsightTileProps = {
  insight: Insight | null;
};

// One thing worth noticing, in a tinted tile rather than an ink one — an
// observation is not a number, and it should not compete with the ones around
// it for the eye. A tint, so everything on it is ink and never a fill label.
//
export const InsightTile = ({ insight }: InsightTileProps) => {
  if (insight === null) {
    return null;
  }

  return (
    <BentoTile
      tone="accent"
      to="/trends"
      ariaLabel={insight.text}
      className="flex min-h-26 flex-col justify-between p-4"
    >
      <InsightIcon icon={insight.icon} className="h-4.5 w-4.5" />
      <p className="text-[0.78rem] leading-snug text-foreground">
        {insight.text}
      </p>
    </BentoTile>
  );
};
