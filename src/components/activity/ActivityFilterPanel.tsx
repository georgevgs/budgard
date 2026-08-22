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
import type { Category } from '@/types/Category';
import type { Tag } from '@/types/Tag';

type Props = {
  categories: Category[];
  tags: Tag[];
  selectedCategoryId: string | null;
  selectedTagId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onTagChange: (tagId: string | null) => void;
};

// Category and tag pickers used to sit permanently above the feed, next to an
// import button, an export button and a tag-management pencil — five rows of
// controls before the first transaction on a phone. They live behind one
// button now, which carries a count so an active filter is still impossible
// to miss.
const ActivityFilterPanel = (props: Props) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const activeCount = countActive(
    props.selectedCategoryId,
    props.selectedTagId,
  );

  const handleClear = () => {
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
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        aria-label={getTriggerLabel(activeCount, t)}
        className="h-11 shrink-0 gap-2 rounded-xl bg-card px-3 shadow-none"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">{t('activity.refine.trigger')}</span>
        {renderCountBadge(activeCount)}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[440px]" onOpenChange={setIsOpen}>
          <DialogHeader className="pr-10" data-draggable-area>
            <DialogTitle>{t('activity.refine.title')}</DialogTitle>
            <DialogDescription>
              {t('activity.refine.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <ActivityCategorySelect
              categories={props.categories}
              selectedCategoryId={props.selectedCategoryId}
              onChange={props.onCategoryChange}
            />
            <Select
              value={props.selectedTagId ?? 'all'}
              onValueChange={handleTagChange}
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
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={activeCount === 0}
            >
              {t('activity.refine.clear')}
            </Button>
            <Button type="button" onClick={() => setIsOpen(false)}>
              {t('activity.refine.done')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ActivityFilterPanel;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const countActive = (
  categoryId: string | null,
  tagId: string | null,
): number => {
  let count = 0;
  if (categoryId) {
    count += 1;
  }
  if (tagId) {
    count += 1;
  }

  return count;
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
      className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground"
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
