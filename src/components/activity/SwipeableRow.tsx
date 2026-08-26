import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { useSwipeActions, SWIPE_ACTION_WIDTH } from '@/hooks/useSwipeActions';
import { prefersReducedMotion } from '@/lib/motion';

type Props = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel: string;
};

// Wraps an activity row so it can be pulled aside to reveal Delete. The row
// itself stays a link, so tapping it still opens the transaction — the swipe
// only adds a second way in, it does not take the first one away.
//
// The wrapper is also the row's surface. Since the bento redesign a row is its
// own rounded pill rather than a band inside a list card, and the pill has to
// be the thing that clips the delete action — otherwise the reveal shows up
// square behind a rounded row.
const SwipeableRow = ({ children, onDelete, deleteLabel }: Props) => {
  const { t } = useTranslation();
  const swipe = useSwipeActions();

  return (
    <div className="tile-flush rounded-[1.375rem]">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: SWIPE_ACTION_WIDTH }}
        aria-hidden={ariaHidden(swipe.isOpen)}
      >
        <button
          type="button"
          onClick={() => {
            swipe.close();
            onDelete();
          }}
          // Off the tab order while hidden: a keyboard user reaches Delete on
          // the transaction screen, and an invisible tab stop between every
          // two rows would make the list unusable with a keyboard.
          tabIndex={tabIndexFor(swipe.isOpen)}
          aria-label={deleteLabel}
          className="flex w-full flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-semibold">
            {t('common.delete')}
          </span>
        </button>
      </div>

      <div
        {...swipe.handlers}
        className="relative bg-tile"
        style={{
          // Vertical travel belongs to page scrolling; horizontal travel is
          // reserved for this row's reveal instead of browser navigation.
          touchAction: 'pan-y pinch-zoom',
          transform: `translateX(${swipe.offset}px)`,
          transition: settleTransition(swipe.isDragging),
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;

// --- Helpers ---

const ariaHidden = (isOpen: boolean): boolean => !isOpen;

const tabIndexFor = (isOpen: boolean): number => {
  if (isOpen) {
    return 0;
  }

  return -1;
};

// Nothing eased while the finger is down; the snap open or shut is the only
// animated part, so it is the only part reduced motion collapses.
const settleTransition = (isDragging: boolean): string => {
  if (isDragging) {
    return 'none';
  }
  if (prefersReducedMotion()) {
    return 'transform 0.01ms';
  }

  return 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1)';
};
