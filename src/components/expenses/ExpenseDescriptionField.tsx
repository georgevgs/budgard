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
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { renderSuggestionMeta } from '@/components/expenses/ExpensesForm.helpers';
import type { DescriptionSuggestionsApi } from '@/hooks/expenseForm/useDescriptionSuggestions';
import type { ExpenseFormData } from '@/lib/validations';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  suggestions: DescriptionSuggestionsApi;
};

const ExpenseDescriptionField = ({ form, suggestions }: Props) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
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
                  aria-label={t('expenses.descriptionLabel')}
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
