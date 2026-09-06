import type { ComponentType } from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  value: string | null;
  description: string;
  setupLabel: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

// Planning destinations are navigation, not four competing dashboard stats.
// Once a tool has data its value earns a place on the row; until then the row
// offers a clear setup action instead of presenting a dead zero as insight.
const PlanOverviewCard = ({
  title,
  value,
  description,
  setupLabel,
  path,
  icon: Icon,
}: Props) => {
  return (
    <Link
      to={path}
      viewTransition
      aria-label={title}
      className="group flex min-h-18 items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      {renderValue(value, setupLabel)}
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
};

export default PlanOverviewCard;

// --- Helpers ---

const renderValue = (value: string | null, setupLabel: string) => {
  if (!value) {
    return (
      <span className="shrink-0 text-xs font-semibold text-primary-ink">
        {setupLabel}
      </span>
    );
  }

  return (
    <span className="shrink-0 text-xs font-semibold tabular-nums">{value}</span>
  );
};
