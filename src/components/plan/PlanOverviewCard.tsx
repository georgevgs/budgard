import type { ComponentType } from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import BentoTile from '@/components/bento/BentoTile';
import TileLabel from '@/components/bento/TileLabel';

type Props = {
  title: string;
  value: string;
  description: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

// The icon chip is the same on all four, and it is the same chip the rest of
// the app already uses (`UpcomingBillsCard`, `PaywallFeatures`, `TodayArrange`).
// The four used to carry a hue each — orange, green, gold, blue — passed in as
// a `toneClass` prop: a pastel per destination, which is four accents on one
// screen in an app with one. Goals are not income and net worth is not
// information, so the hues meant nothing; what they cost was the orange, which
// stops reading as the app's accent the moment it is one of four.
//
// The icon and the label do the telling apart. Colour is not a labelling
// device here — it is reserved for the figure that needs attention.
const PlanOverviewCard = ({
  title,
  value,
  description,
  path,
  icon: Icon,
}: Props) => {
  return (
    <BentoTile
      to={path}
      ariaLabel={title}
      className="group flex min-h-33 flex-col p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <TileLabel className="mt-4 line-clamp-2 min-h-[2.7em] max-w-full whitespace-normal break-normal leading-[1.35]">
        {title}
      </TileLabel>
      <p className="mt-1.5 type-figure-sm">
        {value}
      </p>
      <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">
        {description}
      </p>
    </BentoTile>
  );
};

export default PlanOverviewCard;
