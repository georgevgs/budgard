import { useState, useMemo, useEffect, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { CategoryManager } from '@/components/categories/CategoryManager';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import { format, parseISO } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import {
  cn,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/utils';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '@/lib/currencies';
import { fetchExchangeRate } from '@/services/exchangeRateService';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { incomeSchema, type IncomeFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';

type IncomeFormProps = {
  income?: Expense;
  onClose: (savedIncome?: Expense) => void;
};

const IncomeForm = ({ income, onClose }: IncomeFormProps) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { incomeCategories, defaultCurrency } = useData();
  const { handleIncomeSubmit, handleCategoryAdd } = useDataOperations();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCreatingCategory, startCategoryCreation] = useTransition();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(
    income?.original_currency ?? defaultCurrency,
  );
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialAmount = income
    ? formatCurrencyInput(
        (income.original_currency && income.original_currency !== defaultCurrency
          ? (income.original_amount ?? income.amount)
          : income.amount
        )
          .toString()
          .replace('.', ','),
      )
    : '';

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: initialAmount,
      description: income?.description || '',
      category_id: income?.category_id || 'none',
      date: income ? parseISO(income.date) : new Date(),
    },
  });

  const watchedAmount = form.watch('amount');
  const watchedDate = form.watch('date');
  const watchedDateStr = watchedDate ? format(watchedDate, 'yyyy-MM-dd') : '';
  const selectedCategoryId = form.watch('category_id');
  const selectedCategory = incomeCategories.find(
    (c) => c.id === selectedCategoryId,
  );

  const filteredCategories = useMemo(() => {
    if (!categorySearch) return incomeCategories;
    const lower = categorySearch.toLowerCase();

    return incomeCategories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [incomeCategories, categorySearch]);

  const trimmedSearch = categorySearch.trim();
  const hasExactMatch = incomeCategories.some(
    (c) => c.name.toLowerCase() === trimmedSearch.toLowerCase(),
  );
  // When the user is typing a unique new name, the bottom row becomes a quick
  // "+ Create" action. Otherwise it's "Manage sources" (combined add + edit + delete).
  const showCreateOption = trimmedSearch.length > 0 && !hasExactMatch;

  const handleOpenManager = () => {
    setCategoryPopoverOpen(false);
    setIsManagerOpen(true);
  };

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

  const handleCategorySelect = (id: string) => {
    form.setValue('category_id', id);
    setCategoryPopoverOpen(false);
    setCategorySearch('');
  };

  const handleCategoryCreateInline = () => {
    if (!categorySearch.trim() || isCreatingCategory) return;
    if (!session?.user?.id) return;

    const userId = session.user.id;
    startCategoryCreation(async () => {
      try {
        await handleCategoryAdd({
          name: categorySearch.trim(),
          color: INCOME_COLORS[incomeCategories.length % INCOME_COLORS.length],
          icon: null,
          user_id: userId,
          type: 'income',
          kind: 'income',
        });
        setCategoryPopoverOpen(false);
        setCategorySearch('');
      } catch {
        // toast already shown
      }
    });
  };

  const handleSubmit = async (values: IncomeFormData) => {
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
        const rate =
          exchangeRate ??
          (await fetchExchangeRate(
            selectedCurrency,
            dateStr,
            undefined,
            defaultCurrency,
          ));
        finalAmount = Math.round(rawAmount * rate * 100) / 100;
        originalAmount = rawAmount;
        originalCurrency = selectedCurrency;
        exchangeRateValue = rate;
      }

      const payload: Partial<Expense> = {
        amount: finalAmount,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        exchange_rate: exchangeRateValue,
        description: values.description,
        category_id: values.category_id === 'none' ? null : values.category_id,
        date: dateStr,
        user_id: session.user.id,
      };

      const saved = await handleIncomeSubmit(payload, income?.id);
      onClose(saved ?? undefined);
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

      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">
            {renderFormTitle(Boolean(income), t)}
          </DialogTitle>
          <DialogDescription>{t('income.formDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => handleSubmit(v))}
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
                      onValueChange={setSelectedCurrency}
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
                            const formatted = formatCurrencyInput(
                              e.target.value,
                            );
                            field.onChange(formatted);
                          }}
                          className="pl-7"
                          aria-label={t('income.amountLabel')}
                        />
                      </FormControl>
                    </div>
                  </div>
                  {renderConversionPreview(
                    isFetchingRate,
                    rateError,
                    previewConvertedAmount,
                    selectedCurrency,
                    defaultCurrency,
                    t,
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t('income.descriptionPlaceholder')}
                      {...field}
                      autoComplete="off"
                      aria-label={t('income.descriptionLabel')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={() => (
                <FormItem>
                  <Popover
                    open={categoryPopoverOpen}
                    onOpenChange={setCategoryPopoverOpen}
                    modal={false}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-between font-normal',
                            !selectedCategory && 'text-muted-foreground',
                          )}
                        >
                          {renderCategoryButtonContent(selectedCategory, t)}
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
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (
                                filteredCategories.length === 1 &&
                                !showCreateOption
                              ) {
                                handleCategorySelect(filteredCategories[0].id);
                              } else if (showCreateOption) {
                                handleCategoryCreateInline();
                              }
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <div
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                        style={{ touchAction: 'pan-y' }}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-muted-foreground"
                          onClick={() => handleCategorySelect('none')}
                        >
                          {t('income.noCategory')}
                        </button>
                        {filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                            onClick={() => handleCategorySelect(category.id)}
                          >
                            {renderCategoryDot(category)}
                            {category.name}
                          </button>
                        ))}
                      </div>
                      {/* Sticky footer — always visible regardless of list scroll */}
                      <div className="shrink-0">
                        {renderBottomAction(
                          showCreateOption,
                          isCreatingCategory,
                          trimmedSearch,
                          handleCategoryCreateInline,
                          handleOpenManager,
                          t,
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
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
                        locale={dateLocale}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button type="button" variant="outline" onClick={() => onClose()}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-income text-income-foreground hover:bg-income/90"
              >
                {renderSaveButtonLabel(isSubmitting, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Nested manager dialog — single entry point for add + edit + delete */}
      <Dialog
        open={isManagerOpen}
        onOpenChange={(open) => setIsManagerOpen(open)}
      >
        <DialogContent
          className="sm:max-w-[500px] p-0 gap-0 [&>button]:hidden flex flex-col max-h-[85vh]"
          onOpenChange={(open: boolean) => setIsManagerOpen(open)}
        >
          <CategoryManager categoryType="income" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncomeForm;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INCOME_COLORS = [
  '#10b981',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#84cc16',
];

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderFormTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('income.editIncome');

  return t('income.addIncome');
};

const renderSaveButtonLabel = (isSubmitting: boolean, t: TranslateFunction) => {
  if (isSubmitting) return t('common.saving');

  return t('income.saveIncome');
};

const renderDateValue = (
  date: Date | undefined,
  locale: Locale,
  placeholder: string,
) => {
  if (!date) return <span>{placeholder}</span>;

  return format(date, 'PPP', { locale });
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

const renderCategoryButtonContent = (
  category: Category | undefined,
  t: TranslateFunction,
) => {
  if (!category) {
    return <span>{t('income.selectCategory')}</span>;
  }

  return (
    <span className="flex items-center gap-2">
      {renderCategoryDot(category)}
      {category.name}
    </span>
  );
};

const renderCategoryDot = (category: Category) => {
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

const renderBottomAction = (
  showCreate: boolean,
  isCreating: boolean,
  trimmedSearch: string,
  onCreate: () => void,
  onManage: () => void,
  t: TranslateFunction,
) => {
  // Quick create when user is typing a unique new source — fast path.
  if (showCreate) {
    const label = isCreating
      ? t('common.saving')
      : t('income.createCategory', { name: trimmedSearch });

    return (
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left text-primary border-t border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onCreate}
        disabled={isCreating}
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );
  }

  // Default: combined add + edit entry point.
  return (
    <button
      type="button"
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent text-left text-muted-foreground hover:text-foreground border-t border-border/40"
      onClick={onManage}
    >
      <Settings2 className="h-3.5 w-3.5 shrink-0" />
      {t('income.manageSources')}
    </button>
  );
};
