import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

type Props = {
  title: string;
  value: string;
  description: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  toneClass: string;
};

const PlanOverviewCard = ({
  title,
  value,
  description,
  path,
  icon: Icon,
  toneClass,
}: Props) => {
  return (
    <Link
      to={path}
      viewTransition
      className="group flex min-h-36 flex-col surface-card p-4 transition-[background-color,scale] hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-[-0.02em]">
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  );
};

export default PlanOverviewCard;
