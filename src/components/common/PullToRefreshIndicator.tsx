import { useTranslation } from 'react-i18next';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { cn } from '@/lib/utils';
import type { PullToRefreshState } from '@/hooks/usePullToRefresh';

type Props = {
  state: PullToRefreshState;
};

// Rides down from behind the header as the page is pulled. Fixed rather than
// in flow so nothing below it reflows during the gesture — a list that shifts
// while being dragged reads as the app struggling to keep up.
const PullToRefreshIndicator = ({ state }: Props) => {
  if (state.distance <= 0) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-(--header-height) z-40 flex justify-center"
        style={{
          transform: `translateY(${state.distance - 28}px)`,
          opacity: Math.min(state.progress * 1.4, 1),
        }}
      >
        <div className="rounded-full bg-card p-2 shadow-md ring-1 ring-border/50">
          <RefreshCw
            className={cn('h-5 w-5 text-primary-ink', spinClass(state))}
            style={{ transform: iconTransform(state) }}
          />
        </div>
      </div>
      {/* A sibling, not a child: anything inside the aria-hidden wrapper above
          is invisible to a screen reader, announcement included. */}
      <RefreshAnnouncement isRefreshing={state.isRefreshing} />
    </>
  );
};

export default PullToRefreshIndicator;

// --- Helpers ---

// While pulling, the icon turns with the gesture so the user is winding it up
// themselves. Once released it spins under its own power.
const spinClass = (state: PullToRefreshState): string => {
  if (state.isRefreshing) {
    return 'animate-spin';
  }

  return '';
};

const iconTransform = (state: PullToRefreshState): string | undefined => {
  if (state.isRefreshing) {
    return undefined;
  }

  return `rotate(${state.progress * 270}deg)`;
};

// The indicator itself is decorative; this is the part a screen reader gets.
const RefreshAnnouncement = ({ isRefreshing }: { isRefreshing: boolean }) => {
  const { t } = useTranslation();

  if (!isRefreshing) {
    return null;
  }

  return (
    <span role="status" aria-live="polite" className="sr-only">
      {t('common.refreshing')}
    </span>
  );
};
