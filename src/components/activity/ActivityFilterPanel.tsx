import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SlidersHorizontal from 'lucide-react/dist/esm/icons/sliders-horizontal';
import TagIcon from 'lucide-react/dist/esm/icons/tag';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ActivityCategorySelect from '@/components/activity/ActivityCategorySelect';
import ActivityPeriodSelector from '@/components/activity/ActivityPeriodSelector';
import type {
  ActivityKind,
  ActivityPeriod,
} from '@/hooks/activity/useActivityFeed';
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

type Props = {
  categories: Category[];
  tags: Tag[];
  kind: ActivityKind;
  period: ActivityPeriod;
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  onKindChange: (kind: ActivityKind) => void;
  onPeriodChange: (period: ActivityPeriod) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onTagChange: (tagId: string | null) => void;
};

// Every refinement lives behind one button, which carries a count so an active
// choice remains visible without making every visit scan a control dashboard.
const ActivityFilterPanel = (props: Props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = countActive(
    props.kind,
    props.period,
    props.selectedCategoryId,
    props.selectedTagId,
  );

  const handleClear = () => {
    props.onKindChange('all');
    props.onPeriodChange('month');
    props.onCategoryChange(null);
    props.onTagChange(null);
  };

  const handleTagChange = (value: string) => {
    if (value === 'all') {
      props.onTagChange(null);

      return;
    }

    props.onTagChange(value);
  };

  return (
    <>
      {renderTrigger(activeCount, () => setIsOpen(true), t)}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {renderPanel(
          props,
          activeCount,
          handleClear,
          handleTagChange,
          () => setIsOpen(false),
          t,
        )}
      </Dialog>
    </>
  );
};

export default ActivityFilterPanel;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const renderTrigger = (activeCount: number, onOpen: () => void, t: TFunc) => (
  <Button
    type="button"
    variant="outline"
    onClick={onOpen}
    aria-label={getTriggerLabel(activeCount, t)}
    className="h-11 shrink-0 gap-2 rounded-xl bg-card px-3 shadow-none"
  >
    <SlidersHorizontal className="h-4 w-4" />
    <span className="hidden sm:inline">{t('activity.refine.trigger')}</span>
    {renderCountBadge(activeCount)}
  </Button>
);

const renderPanel = (
  props: Props,
  activeCount: number,
  onClear: () => void,
  onTagChange: (value: string) => void,
  onClose: () => void,
  t: TFunc,
) => (
  <DialogContent className="sm:max-w-[440px]" onOpenChange={onClose}>
    <DialogHeader className="pr-10" data-draggable-area>
      <DialogTitle>{t('activity.refine.title')}</DialogTitle>
      <DialogDescription>{t('activity.refine.description')}</DialogDescription>
    </DialogHeader>
    <div className="space-y-5">
      {renderKindControl(props, t)}
      {renderPeriodControl(props, t)}
      <ActivityCategorySelect
        categories={props.categories}
        selectedCategoryId={props.selectedCategoryId}
        onChange={props.onCategoryChange}
      />
      {renderTagControl(props, onTagChange, t)}
    </div>
    <div className="flex justify-between gap-3 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={activeCount === 0}
      >
        {t('activity.refine.clear')}
      </Button>
      <Button type="button" onClick={onClose}>
        {t('activity.refine.done')}
      </Button>
    </div>
  </DialogContent>
);

const renderKindControl = (props: Props, t: TFunc) => (
  <section aria-labelledby="activity-kind-label">
    <p
      id="activity-kind-label"
      className="mb-2 text-xs font-semibold text-muted-foreground"
    >
      {t('activity.kindLabel')}
    </p>
    <div
      className="segmented grid w-full grid-cols-3"
      role="group"
      aria-labelledby="activity-kind-label"
    >
      {renderKindButton('all', props, t)}
      {renderKindButton('expense', props, t)}
      {renderKindButton('income', props, t)}
    </div>
  </section>
);

const renderPeriodControl = (props: Props, t: TFunc) => (
  <section aria-labelledby="activity-period-label">
    <p
      id="activity-period-label"
      className="mb-2 text-xs font-semibold text-muted-foreground"
    >
      {t('activity.period.label')}
    </p>
    <ActivityPeriodSelector
      period={props.period}
      onPeriodChange={props.onPeriodChange}
    />
  </section>
);

const renderTagControl = (
  props: Props,
  onTagChange: (value: string) => void,
  t: TFunc,
) => (
  <Select
    value={props.selectedTagId ?? 'all'}
    onValueChange={onTagChange}
    disabled={props.tags.length === 0}
  >
    <SelectTrigger
      className="h-11 w-full rounded-xl border-input bg-card shadow-none [&>span]:flex-1 [&>span]:text-left"
      aria-label={t('activity.filterByTag')}
    >
      <TagIcon className="mr-2 h-4 w-4 shrink-0 text-primary-ink" />
      <SelectValue placeholder={t('activity.allTags')} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">{t('activity.allTags')}</SelectItem>
      {props.tags.map((tag) => renderTagOption(tag))}
    </SelectContent>
  </Select>
);

const countActive = (
  kind: ActivityKind,
  period: ActivityPeriod,
  categoryId: string | null,
  tagId: string | null,
): number => {
  let count = 0;
  if (kind !== 'all') {
    count += 1;
  }
  if (period !== 'month') {
    count += 1;
  }
  if (categoryId) {
    count += 1;
  }
  if (tagId) {
    count += 1;
  }

  return count;
};

const renderKindButton = (value: ActivityKind, props: Props, t: TFunc) => {
  const isActive = props.kind === value;

  return (
    <button
      key={value}
      type="button"
      onClick={() => props.onKindChange(value)}
      aria-pressed={isActive}
      data-active={isActive}
      className="segmented-item cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {t(`activity.filters.${value}`)}
    </button>
  );
};

const getTriggerLabel = (activeCount: number, t: TFunc): string => {
  if (activeCount === 0) {
    return t('activity.refine.trigger');
  }

  return t('activity.refine.triggerWithCount', { count: activeCount });
};

const renderCountBadge = (activeCount: number) => {
  if (activeCount === 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
    >
      {activeCount}
    </span>
  );
};

const renderTagOption = (tag: Tag) => (
  <SelectItem key={tag.id} value={tag.id}>
    <span className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: tag.color }}
        aria-hidden="true"
      />
      {tag.name}
    </span>
  </SelectItem>
);
