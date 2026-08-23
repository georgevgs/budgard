import { useTranslation } from 'react-i18next';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import Minus from 'lucide-react/dist/esm/icons/minus';
import Plus from 'lucide-react/dist/esm/icons/plus';
import BentoGrid from '@/components/bento/BentoGrid';
import TileLabel from '@/components/bento/TileLabel';
import { cn } from '@/lib/utils';
import type { TodayLayoutControls } from '@/hooks/today/useTodayLayout';
import type { TodayTileId } from '@/lib/bentoLayout';

type Props = {
  layout: TodayLayoutControls;
};

// The grid, stood down to its labels so it can be rearranged. Real tiles are
// not shown here on purpose: arranging is about which module goes where, and
// six live charts competing for attention is the wrong screen for that
// decision — as well as six re-renders per tap.
const TodayArrange = ({ layout }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {t('today.arrange.hint')}
      </p>
      <BentoGrid>
        {layout.visible.map((id, index) =>
          renderVisible(id, index, layout, t),
        )}
      </BentoGrid>
      <TileLabel className="mt-7 mb-2.5 px-1">
        {t('today.arrange.hidden')}
      </TileLabel>
      {renderHidden(layout, t)}
      <button
        type="button"
        onClick={layout.reset}
        className="mt-6 min-h-11 text-xs font-semibold text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('today.arrange.reset')}
      </button>
    </div>
  );
};

export default TodayArrange;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Alternating half-degree tilt. Static, not animated, so it reads as "these
// are loose and can be moved" without costing anyone a motion preference.
const getTilt = (index: number): string => {
  if (index % 2 === 0) {
    return '-rotate-[0.5deg]';
  }

  return 'rotate-[0.5deg]';
};

const renderVisible = (
  id: TodayTileId,
  index: number,
  layout: TodayLayoutControls,
  t: TFunc,
) => {
  const name = t(`today.tiles.${id}`);

  return (
    <div
      key={id}
      className={cn('tile flex min-h-24 flex-col justify-between p-4', getTilt(index))}
    >
      <div className="flex items-start justify-between gap-2">
        <TileLabel className="pt-0.5">{name}</TileLabel>
        <button
          type="button"
          onClick={() => layout.hide(id)}
          aria-label={t('today.arrange.hide', { name })}
          className="-mt-1.5 -mr-1.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex gap-1.5">
        {renderMove(id, -1, index === 0, layout, t)}
        {renderMove(id, 1, index === layout.visible.length - 1, layout, t)}
      </div>
    </div>
  );
};

const renderMove = (
  id: TodayTileId,
  offset: number,
  isDisabled: boolean,
  layout: TodayLayoutControls,
  t: TFunc,
) => {
  const name = t(`today.tiles.${id}`);
  let label = t('today.arrange.moveDown', { name });
  let Icon = ChevronDown;
  if (offset < 0) {
    label = t('today.arrange.moveUp', { name });
    Icon = ChevronUp;
  }

  return (
    <button
      type="button"
      onClick={() => layout.move(id, offset)}
      disabled={isDisabled}
      aria-label={label}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent text-foreground transition-opacity disabled:cursor-default disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

const renderHidden = (layout: TodayLayoutControls, t: TFunc) => {
  if (layout.hidden.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('today.arrange.allShown')}
      </p>
    );
  }

  return (
    <BentoGrid>
      {layout.hidden.map((id) => {
        const name = t(`today.tiles.${id}`);

        return (
          <button
            key={id}
            type="button"
            onClick={() => layout.show(id)}
            aria-label={t('today.arrange.show', { name })}
            className="tile-ghost flex min-h-19 cursor-pointer items-center gap-2.5 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-primary/14 text-primary-ink">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 truncate text-[0.8rem] font-medium text-muted-foreground">
              {name}
            </span>
          </button>
        );
      })}
    </BentoGrid>
  );
};
