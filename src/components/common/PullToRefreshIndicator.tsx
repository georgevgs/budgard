import { useTranslation } from 'react-i18next';
import type { PullToRefreshState } from '@/hooks/usePullToRefresh';

type Props = {
  state: PullToRefreshState;
};

// Rides out from behind the header as the page is pulled and lands clear of it
// at the moment the gesture arms, so the puck and the bar are never overlapped.
// Fixed rather than in flow so nothing below it reflows during the gesture — a
// list that shifts while being dragged reads as the app struggling to keep up.
//
// Everything it does visually is driven by --pull-progress and the data-pull
// stage that usePullToRefresh writes onto the document element (see the
// pull-to-refresh block in index.css), so a drag never re-renders this tree.
const PullToRefreshIndicator = ({ state }: Props) => {
  if (!state.isEnabled) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-height)+env(safe-area-inset-top))] z-40 flex justify-center"
      >
        <div className="pull-puck lift flex size-9 items-center justify-center rounded-full border border-border/70 bg-card">
          <ProgressRing />
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

// The ring fills as the pull approaches its trigger, then becomes an ordinary
// indeterminate spinner once released — the same two-part read as iOS and
// Material, and a far better answer to "how much further?" than an icon that
// merely rotates.
//
// pathLength normalises the circle to 100 units so the dash offset in index.css
// is a plain percentage of the ring rather than a magic number derived from the
// radius, which would silently desync the moment the ring was resized.
const ProgressRing = () => (
  <svg className="pull-ring size-5" viewBox="0 0 24 24" fill="none">
    <circle
      className="pull-ring-track"
      cx="12"
      cy="12"
      r="10"
      strokeWidth="2.5"
    />
    <circle
      className="pull-ring-arc"
      cx="12"
      cy="12"
      r="10"
      strokeWidth="2.5"
      strokeLinecap="round"
      pathLength="100"
    />
  </svg>
);

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
