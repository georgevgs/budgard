import BentoTile from '@/components/bento/BentoTile';
import InsightIcon from '@/components/common/InsightIcon';
import type { Insight } from '@/hooks/useSpendingInsights';

type Props = {
  insight: Insight | null;
};

// One thing worth noticing, in a tinted tile rather than an ink one — an
// observation is not a number, and it should not compete with the ones around
// it for the eye. A tint, so everything on it is ink and never a fill label.
//
// Which is what the icon had stopped being: it sat on a SOLID `bg-income` disc,
// so the module carried a green circle on a peach ground — two hues on the
// smallest surface in the grid, neither agreeing with the other. The variant
// now rides the glyph itself. See InsightIcon.
const InsightTile = ({ insight }: Props) => {
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
      <InsightIcon
        variant={insight.variant}
        icon={insight.icon}
        className="h-4.5 w-4.5"
      />
      <p className="text-[0.78rem] leading-snug text-foreground/85">
        {insight.text}
      </p>
    </BentoTile>
  );
};

export default InsightTile;
