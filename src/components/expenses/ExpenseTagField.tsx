import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TagButtonContent } from '@/components/expenses/TagPicker';
import {
  renderTagClearIndicator,
  renderCreateTagOption,
  renderNoTagsMessage,
} from '@/components/expenses/ExpensesForm.helpers';
import type { TagPickerApi } from '@/hooks/expenseForm/useTagPicker';
import type { ExpenseFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  tagPicker: TagPickerApi;
};

const ExpenseTagField = ({ form, tagPicker }: Props) => {
  const { t } = useTranslation();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    if (tagPicker.filteredTags.length === 1 && !tagPicker.showCreateOption) {
      tagPicker.handleTagSelect(tagPicker.filteredTags[0].id);
    } else if (tagPicker.showCreateOption) {
      tagPicker.handleTagCreateInline();
    }
  };

  return (
    <FormField
      control={form.control}
      name="tag_id"
      render={() => (
        <FormItem>
          <Popover
            open={tagPicker.tagPopoverOpen}
            onOpenChange={tagPicker.setTagPopoverOpen}
            modal={false}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-between font-normal',
                    !tagPicker.selectedTag && 'text-muted-foreground',
                  )}
                >
                  <TagButtonContent selectedTag={tagPicker.selectedTag} />
                  {renderTagClearIndicator(
                    tagPicker.selectedTag,
                    tagPicker.handleTagClear,
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="p-2">
                <Input
                  placeholder={t('expenses.tagSearchPlaceholder')}
                  value={tagPicker.tagSearch}
                  onChange={(e) => tagPicker.setTagSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {tagPicker.filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left focus-visible:outline-none focus-visible:bg-accent"
                    onClick={() => tagPicker.handleTagSelect(tag.id)}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
                {renderCreateTagOption(
                  tagPicker.showCreateOption,
                  tagPicker.isCreatingTag,
                  tagPicker.tagSearch,
                  tagPicker.handleTagCreateInline,
                  t,
                )}
                {renderNoTagsMessage(
                  tagPicker.filteredTags.length,
                  tagPicker.showCreateOption,
                  t,
                )}
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ExpenseTagField;
