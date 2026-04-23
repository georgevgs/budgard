import { useState, useMemo, useEffect, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Tag from 'lucide-react/dist/esm/icons/tag';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { cn, formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/currencies';
import { fetchExchangeRate } from '@/services/exchangeRateService';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/contexts/DataContext';
import {
  useDataOperations,
  type ReceiptOptions,
} from '@/hooks/useDataOperations';
import { expenseSchema, type ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import ReceiptUpload from '@/components/expenses/ReceiptUpload';
import { TagButtonContent, TagClearButton } from '@/components/expenses/TagPicker';

// Preset colors cycled when auto-assigning a color to a new tag
const TAG_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
];

type ExpensesFormProps = {
  expense?: Expense;
  categories: Category[];
  onClose: () => void;
  onSubmit: (
    data: Partial<Expense>,
    expenseId?: string,
    receiptOptions?: ReceiptOptions,
  ) => void;
};

const ExpensesForm = ({
  expense,
  categories,
  onClose,
  onSubmit,
}: ExpensesFormProps) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { tags, expenses: allExpenses, defaultCurrency } = useData();
  const { handleTagCreate } = useDataOperations();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isCreatingTag, startTagCreation] = useTransition();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(() =>
    Boolean(expense?.tag_id || expense?.receipt_path),
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    expense?.original_currency ?? defaultCurrency,
  );
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialAmount = expense
    ? formatCurrencyInput(
        (expense.original_currency && expense.original_currency !== defaultCurrency
          ? (expense.original_amount ?? expense.amount)
          : expense.amount
        )
          .toString()
          .replace('.', ','),
      )
    : '';

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: initialAmount,
      description: expense?.description || '',
      category_id: expense?.category_id || 'none',
      tag_id: expense?.tag_id || undefined,
      date: expense ? parseISO(expense.date) : new Date(),
    },
  });

  const selectedTagId = form.watch('tag_id');
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags;
    const lower = tagSearch.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(lower));
  }, [tags, tagSearch]);

  const watchedAmount = form.watch('amount');
  const watchedDate = form.watch('date');
  const watchedDateStr = watchedDate ? format(watchedDate, 'yyyy-MM-dd') : '';

  useEffect(() => {
    if (selectedCurrency === defaultCurrency) {
      setExchangeRate(null);
      setRateError(false);
      return;
    }

    if (!watchedDateStr) return;

    const controller = new AbortController();

    const fetchRate = async () => {
      setIsFetchingRate(true);
      setRateError(false);
      try {
        const rate = await fetchExchangeRate(
          selectedCurrency,
          watchedDateStr,
          controller.signal,
          defaultCurrency,
        );
        if (!controller.signal.aborted) setExchangeRate(rate);
      } catch {
        if (!controller.signal.aborted) {
          setRateError(true);
          setExchangeRate(null);
        }
      } finally {
        if (!controller.signal.aborted) setIsFetchingRate(false);
      }
    };

    void fetchRate();
    return () => controller.abort();
  }, [selectedCurrency, watchedDateStr, defaultCurrency]);

  const previewConvertedAmount = useMemo(() => {
    if (selectedCurrency === defaultCurrency || !exchangeRate) return null;
    const raw = parseCurrencyInput(watchedAmount);
    if (!raw) return null;

    return Math.round(raw * exchangeRate * 100) / 100;
  }, [exchangeRate, selectedCurrency, watchedAmount, defaultCurrency]);

  const descriptionValue = form.watch('description');

  const suggestions = useMemo(() => {
    const seen = new Map<string, Expense>();
    const sorted = [...allExpenses].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    for (const expense of sorted) {
      const key = expense.description.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, expense);
      }
    }

    return Array.from(seen.values());
  }, [allExpenses]);

  const filteredSuggestions = useMemo(() => {
    const query = descriptionValue.trim().toLowerCase();
    if (!query) return [];

    return suggestions
      .filter((s) => {
        const desc = s.description.toLowerCase();
        return desc.includes(query) && desc !== query;
      })
      .slice(0, 5);
  }, [suggestions, descriptionValue]);

  const handleSuggestionSelect = (selected: Expense) => {
    form.setValue('description', selected.description);
    form.setValue('category_id', selected.category_id ?? 'none');
    form.setValue('tag_id', selected.tag_id ?? undefined);
    setSuggestionsOpen(false);
  };

  const hasExactMatch = tags.some(
    (t) => t.name.toLowerCase() === tagSearch.toLowerCase(),
  );
  const showCreateOption = tagSearch.trim().length > 0 && !hasExactMatch;

  const handleTagSelect = (tagId: string) => {
    form.setValue('tag_id', tagId);
    setTagPopoverOpen(false);
    setTagSearch('');
  };

  const handleTagClear = () => {
    form.setValue('tag_id', undefined);
    setTagSearch('');
  };

  const handleTagCreateInline = () => {
    if (!tagSearch.trim() || isCreatingTag) return;
    startTagCreation(async () => {
      try {
        const color = TAG_COLORS[tags.length % TAG_COLORS.length];
        const newTag = await handleTagCreate(tagSearch.trim(), color);
        form.setValue('tag_id', newTag.id);
        setTagPopoverOpen(false);
        setTagSearch('');
      } catch {
        // error already shown via toast
      }
    });
  };

  const handleCurrencyChange = (value: string) => {
    setSelectedCurrency(value);
    setExchangeRate(null);
    setRateError(false);
  };

  const handleSubmit = async (values: ExpenseFormData) => {
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    try {
      const rawAmount = parseCurrencyInput(values.amount);
      const dateStr = format(values.date, 'yyyy-MM-dd');
      let finalAmount = rawAmount;
      let originalAmount: number | null = null;
      let originalCurrency: string | null = null;
      let exchangeRateValue: number | null = null;

      if (selectedCurrency !== defaultCurrency) {
        const rate = exchangeRate ?? (await fetchExchangeRate(selectedCurrency, dateStr, undefined, defaultCurrency));
        finalAmount = Math.round(rawAmount * rate * 100) / 100;
        originalAmount = rawAmount;
        originalCurrency = selectedCurrency;
        exchangeRateValue = rate;
      }

      const expenseData: Partial<Expense> = {
        amount: finalAmount,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        exchange_rate: exchangeRateValue,
        description: values.description,
        category_id: values.category_id === 'none' ? null : values.category_id,
        tag_id: values.tag_id || null,
        date: dateStr,
        user_id: session.user.id,
      };

      onSubmit(expenseData, expense?.id, {
        receiptFile,
        removeExistingReceipt,
        existingReceiptPath: expense?.receipt_path ?? null,
      });
      onClose();
    } catch {
      setRateError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col max-h-full">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">
            {renderFormTitle(Boolean(expense), t)}
          </DialogTitle>
          <DialogDescription>{t('expenses.formDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <Select
                      value={selectedCurrency}
                      onValueChange={handleCurrencyChange}
                    >
                      <SelectTrigger
                        className="w-20 shrink-0"
                        aria-label={t('expenses.currency.label')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(selectedCurrency)}
                      </span>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9,.]*"
                          placeholder={t('expenses.amountPlaceholder')}
                          value={field.value}
                          onChange={(e) => {
                            const formatted = formatCurrencyInput(e.target.value);
                            field.onChange(formatted);
                          }}
                          className="pl-7"
                          aria-label={t('expenses.amountLabel')}
                        />
                      </FormControl>
                    </div>
                  </div>
                  {renderConversionPreview(isFetchingRate, rateError, previewConvertedAmount, selectedCurrency, defaultCurrency, t)}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <Popover
                    open={suggestionsOpen && filteredSuggestions.length > 0}
                    onOpenChange={setSuggestionsOpen}
                    modal={false}
                  >
                    <PopoverAnchor asChild>
                      <FormControl>
                        <Input
                          placeholder={t('expenses.descriptionPlaceholder')}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setSuggestionsOpen(true);
                          }}
                          onFocus={() => setSuggestionsOpen(true)}
                          autoComplete="off"
                          className="overflow-ellipsis"
                          aria-label={t('expenses.descriptionLabel')}
                        />
                      </FormControl>
                    </PopoverAnchor>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onInteractOutside={() => setSuggestionsOpen(false)}
                    >
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-accent active:bg-accent text-left"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionSelect(suggestion)}
                          >
                            <span className="truncate">
                              {suggestion.description}
                            </span>
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

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('expenses.selectCategory')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" className="max-h-[300px]">
                      <SelectItem value="none">
                        {t('expenses.noCategory')}
                      </SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            {renderCategoryIndicator(category)}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {renderDateValue(
                            field.value,
                            dateLocale,
                            t('expenses.pickDate'),
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={false}
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collapsible details section */}
            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  showDetails && 'rotate-180',
                )}
              />
              {renderDetailsToggleLabel(showDetails, t)}
            </button>

            <div
              className={cn(
                'grid transition-[grid-template-rows] duration-200',
                showDetails ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
              )}
            >
              <div className="overflow-hidden space-y-4">
                {/* Tag field */}
                <FormField
                  control={form.control}
                  name="tag_id"
                  render={() => (
                    <FormItem>
                      <Popover
                        open={tagPopoverOpen}
                        onOpenChange={setTagPopoverOpen}
                        modal={false}
                      >
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                'w-full justify-between font-normal',
                                !selectedTag && 'text-muted-foreground',
                              )}
                            >
                              <TagButtonContent selectedTag={selectedTag} />
                              {renderTagClearIndicator(selectedTag, handleTagClear)}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <div className="p-2">
                            <Input
                              placeholder="Search or create tag..."
                              value={tagSearch}
                              onChange={(e) => setTagSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (
                                    filteredTags.length === 1 &&
                                    !showCreateOption
                                  ) {
                                    handleTagSelect(filteredTags[0].id);
                                  } else if (showCreateOption) {
                                    handleTagCreateInline();
                                  }
                                }
                              }}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {filteredTags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                                onClick={() => handleTagSelect(tag.id)}
                              >
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </button>
                            ))}
                            {renderCreateTagOption(
                              showCreateOption,
                              isCreatingTag,
                              tagSearch,
                              handleTagCreateInline,
                            )}
                            {renderNoTagsMessage(
                              filteredTags.length,
                              showCreateOption,
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ReceiptUpload
                  currentReceiptPath={expense?.receipt_path}
                  selectedFile={receiptFile}
                  isRemoving={removeExistingReceipt}
                  onFileSelect={setReceiptFile}
                  onRemoveExisting={() => setRemoveExistingReceipt(true)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {renderSaveButtonLabel(isSubmitting, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ExpensesForm;

// ─── Helper render functions ──────────────────────────────────────────────────
// Exported for testing

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderDetailsToggleLabel = (
  showDetails: boolean,
  t: TranslateFunction,
) => {
  if (showDetails) return t('expenses.lessDetails');

  return t('expenses.moreDetails');
};

const renderSaveButtonLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('expenses.saveExpense');
};

const renderConversionPreview = (
  isLoading: boolean,
  hasError: boolean,
  convertedAmount: number | null,
  currency: string,
  targetCurrency: string,
  t: TranslateFunction,
) => {
  if (currency === targetCurrency) return null;

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        {t('expenses.currency.fetchingRate')}
      </p>
    );
  }

  if (hasError) {
    return (
      <p className="text-xs text-destructive mt-1">
        {t('expenses.currency.rateError')}
      </p>
    );
  }

  if (!convertedAmount) return null;

  return (
    <p className="text-xs text-muted-foreground mt-1">
      {t('expenses.currency.convertedAmount', {
        amount: formatCurrency(convertedAmount, targetCurrency),
      })}
    </p>
  );
};

const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('expenses.editExpense');

  return t('expenses.addExpense');
};

const renderDateValue = (
  date: Date | undefined,
  locale: Locale,
  placeholder: string,
) => {
  if (!date) return <span>{placeholder}</span>;

  return format(date, 'PPP', { locale });
};

const renderTagClearIndicator = (
  selectedTag: { name: string; color: string } | undefined,
  onClear: () => void,
) => {
  if (!selectedTag) return null;

  return <TagClearButton onClear={onClear} />;
};

const renderCreateTagOption = (
  showCreateOption: boolean,
  isCreatingTag: boolean,
  tagSearch: string,
  onCreate: () => void,
) => {
  if (!showCreateOption) return null;

  const label = isCreatingTag
    ? 'Creating...'
    : `Create tag: "${tagSearch.trim()}"`;

  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary disabled:opacity-50 disabled:pointer-events-none"
      onClick={onCreate}
      disabled={isCreatingTag}
    >
      <Tag className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
};

const renderSuggestionMeta = (suggestion: Expense) => {
  if (!suggestion.category) return null;

  return (
    <span className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
      {suggestion.category.icon ? (
        <span className="text-xs">{suggestion.category.icon}</span>
      ) : (
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: suggestion.category.color }}
        />
      )}
      {suggestion.category.name}
    </span>
  );
};

const renderCategoryIndicator = (category: Category) => {
  if (category.icon) {
    return <span className="text-sm">{category.icon}</span>;
  }

  return (
    <div
      className="w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: category.color }}
      aria-hidden="true"
    />
  );
};

const renderNoTagsMessage = (
  filteredCount: number,
  showCreateOption: boolean,
) => {
  if (filteredCount > 0 || showCreateOption) return null;

  return (
    <p className="px-3 py-2 text-sm text-muted-foreground">No tags found.</p>
  );
};
