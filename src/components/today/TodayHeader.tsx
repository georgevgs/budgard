import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import ProfileMenu from '@/components/layout/ProfileMenu';

type Props = {
  greeting: 'morning' | 'afternoon' | 'evening';
  dateLabel: string;
  isArranging: boolean;
  onArrange: () => void;
  onDone: () => void;
};

// Today's own header. There is no app bar behind it any more, so this is also
// where the account lives — the avatar is the way into Settings from the tab
// people land on.
const TodayHeader = (props: Props) => {
  const { t } = useTranslation();
  const arrangeHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!props.isArranging) {
      return;
    }
    arrangeHeadingRef.current?.focus();
  }, [props.isArranging]);

  if (props.isArranging) {
    return (
      <div className="sticky top-[env(safe-area-inset-top)] z-30 -mx-2 -mt-2 flex items-center justify-between gap-3 bg-background/95 px-2 py-2 backdrop-blur-xl">
        <h1
          ref={arrangeHeadingRef}
          tabIndex={-1}
          className="min-w-0 flex-1 type-title leading-tight focus:outline-none"
        >
          {t('today.arrange.title')}
        </h1>
        <button
          type="button"
          onClick={() => finishArranging(props.onDone)}
          className="flex min-h-11 shrink-0 cursor-pointer items-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t('today.arrange.done')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 py-0.5">
        <h1 className="type-title leading-tight">
          {t(`today.greeting.${props.greeting}`)}
        </h1>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {props.dateLabel}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={props.onArrange}
          aria-label={t('today.arrange.open')}
          data-today-arrange-trigger
          className="tile flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutGrid className="h-4.5 w-4.5" />
        </button>
        <ProfileMenu />
      </div>
    </div>
  );
};

export default TodayHeader;

// --- Helpers ---

const finishArranging = (onDone: () => void): void => {
  onDone();
  window.requestAnimationFrame(() => {
    document
      .querySelector<HTMLButtonElement>('[data-today-arrange-trigger]')
      ?.focus();
  });
};
