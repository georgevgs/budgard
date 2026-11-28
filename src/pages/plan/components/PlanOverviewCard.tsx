import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Link } from 'react-router-dom';
import ObjectTile from '@/common/components/common/ObjectTile/ObjectTile';

type PlanOverviewCardProps = {
  title: string;
  value: string | null;
  description: string;
  setupLabel: string;
  path: string;
  /** The tool's 3D object. */
  emoji: string;
};

// Planning destinations are navigation, not four competing dashboard stats.
// Once a tool has data its value earns a place on the row; until then the row
// offers a clear setup action instead of presenting a dead zero as insight.
export const PlanOverviewCard = ({
  title,
  value,
  description,
  setupLabel,
  path,
  emoji,
}: PlanOverviewCardProps) => {
  return (
    <Link
      to={path}
      viewTransition
      aria-label={title}
      className="group flex min-h-18 items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <ObjectTile emoji={emoji} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      {renderValue(value, setupLabel)}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground/70"
        aria-hidden="true"
      />
    </Link>
  );
};

const renderValue = (value: string | null, setupLabel: string) => {
  if (!value) {
    return (
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {setupLabel}
      </span>
    );
  }

  return (
    <span className="shrink-0 text-xs font-semibold tabular-nums">{value}</span>
  );
};
