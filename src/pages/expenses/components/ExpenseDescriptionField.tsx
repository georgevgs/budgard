import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/common/ui/form';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/common/ui/popover';
import { Input } from '@/common/ui/input';
import { renderSuggestionMeta } from '@/pages/expenses/components/ExpensesForm.helpers';
import type { DescriptionSuggestionsApi } from '@/pages/expenses/hooks/useDescriptionSuggestions';
import type { ExpenseFormData } from '@/pages/expenses/validations';

interface Props {
  form: UseFormReturn<ExpenseFormData>;
  suggestions: DescriptionSuggestionsApi;
}

const ExpenseDescriptionField = ({ form, suggestions }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('expenses.descriptionLabel')}</FormLabel>
          <Popover
            open={suggestions.isPopoverOpen}
            onOpenChange={suggestions.setSuggestionsOpen}
            modal={false}
          >
            <PopoverAnchor asChild>
              <FormControl>
                <Input
                  placeholder={t('expenses.descriptionPlaceholder')}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    suggestions.setSuggestionsOpen(true);
                  }}
                  onFocus={() => suggestions.setSuggestionsOpen(true)}
                  autoComplete="off"
                  className="text-ellipsis"
                />
              </FormControl>
            </PopoverAnchor>
            <PopoverContent
              className="w-(--radix-popover-trigger-width) p-0"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={() => suggestions.setSuggestionsOpen(false)}
            >
              <div className="max-h-[200px] overflow-y-auto">
                {suggestions.filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-accent active:bg-accent text-left focus-visible:outline-none focus-visible:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      suggestions.handleSuggestionSelect(suggestion)
                    }
                  >
                    <span className="truncate">{suggestion.description}</span>
                    {renderSuggestionMeta(suggestion)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ExpenseDescriptionField;
