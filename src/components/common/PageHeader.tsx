import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** Optional line under the title — context, never a second instruction. */
  subtitle?: string;
  /** Optional trailing control, typically the screen's primary add action. */
  action?: ReactNode;
};

// Every screen's title block. The four bottom tabs already shared this
// treatment while Goals, Recurring, Debts, Net worth and Settings kept a
// smaller pre-redesign heading — same app, two typographic tiers. Routing
// them all through one component is what stops that drifting apart again.
const PageHeader = ({ title, subtitle, action }: Props) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.035em]">
          {title}
        </h1>
        {renderSubtitle(subtitle)}
      </div>
      {renderAction(action)}
    </div>
  );
};

export default PageHeader;

// --- Helpers ---

const renderSubtitle = (subtitle?: string) => {
  if (!subtitle) {
    return null;
  }

  return (
    <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
      {subtitle}
    </p>
  );
};

const renderAction = (action?: ReactNode) => {
  if (!action) {
    return null;
  }

  return <div className="shrink-0">{action}</div>;
};
