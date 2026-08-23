import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import BackButton from '@/components/common/BackButton';
import { isSecondaryPath } from '@/lib/routes';

type Props = {
  title: string;
  /** Optional line under the title — context, never a second instruction. */
  subtitle?: string;
  /** Optional trailing control. One round chrome button, or one pill. */
  action?: ReactNode;
};

// Every screen's own header, and the only header there is: the sticky app bar
// went with the bento redesign, because a grid of modules that starts 62px
// down the screen has nowhere to sit under a bar. The title is now part of the
// screen rather than chrome above it, which is also what lets each screen put
// its own control in the trailing slot — the avatar on Today, the period pill
// on Trends, the filter button on Activity.
//
// The way back is not a slot the caller fills. It is decided from the route,
// so a screen cannot ship without one by forgetting to pass it.
const PageHeader = ({ title, subtitle, action }: Props) => {
  const { pathname } = useLocation();

  return (
    <div className="flex items-start gap-3">
      {renderBack(pathname)}
      <div className="min-w-0 flex-1">
        <h1 className="type-title">
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

const renderBack = (pathname: string) => {
  if (!isSecondaryPath(pathname)) {
    return null;
  }

  return <BackButton />;
};

const renderSubtitle = (subtitle?: string) => {
  if (!subtitle) {
    return null;
  }

  return (
    <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
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
