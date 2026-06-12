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
import {
  renderCategoryButtonContent,
  renderCategoryDot,
  renderBottomAction,
} from '@/components/income/IncomeForm.helpers';
import type { IncomeCategoryPickerApi } from '@/hooks/incomeForm/useIncomeCategoryPicker';
import type { IncomeFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<IncomeFormData>;
  picker: IncomeCategoryPickerApi;
};

const IncomeCategoryField = ({ form, picker }: Props) => {
  const { t } = useTranslation();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    if (picker.filteredCategories.length === 1 && !picker.showCreateOption) {
      picker.handleCategorySelect(picker.filteredCategories[0].id);
    } else if (picker.showCreateOption) {
      picker.handleCategoryCreateInline();
    }
  };

  return (
    <FormField
      control={form.control}
      name="category_id"
      render={() => (
        <FormItem>
          <Popover
            open={picker.categoryPopoverOpen}
            onOpenChange={picker.setCategoryPopoverOpen}
            modal={false}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-between font-normal',
                    !picker.selectedCategory && 'text-muted-foreground',
                  )}
                >
                  {renderCategoryButtonContent(picker.selectedCategory, t)}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0 flex flex-col"
              align="start"
              style={{
                maxHeight:
                  'min(360px, var(--radix-popover-content-available-height))',
              }}
            >
              <div className="p-2 shrink-0">
                <Input
                  placeholder={t('income.searchOrCreateCategory')}
                  value={picker.categorySearch}
                  onChange={(e) => picker.setCategorySearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  autoFocus
                />
              </div>
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                style={{ touchAction: 'pan-y' }}
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent text-left text-muted-foreground"
                  onClick={() => picker.handleCategorySelect('none')}
                >
                  {t('income.noCategory')}
                </button>
                {picker.filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:bg-accent text-left"
                    onClick={() => picker.handleCategorySelect(category.id)}
                  >
                    {renderCategoryDot(category)}
                    {category.name}
                  </button>
                ))}
              </div>
              {/* Sticky footer — always visible regardless of list scroll */}
              <div className="shrink-0">
                {renderBottomAction(
                  picker.showCreateOption,
                  picker.isCreatingCategory,
                  picker.trimmedSearch,
                  picker.handleCategoryCreateInline,
                  picker.handleOpenManager,
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

export default IncomeCategoryField;
