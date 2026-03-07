import { useState, useMemo, useTransition } from 'react';
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
import Tag from 'lucide-react/dist/esm/icons/tag';
import X from 'lucide-react/dist/esm/icons/x';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { cn, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/contexts/DataContext';
import { useDataOperations, type ReceiptOptions } from '@/hooks/useDataOperations';
import { expenseSchema, type ExpenseFormData } from '@/lib/validations';
import type { Expense } from '@/types/Expense';
import type { Category } from '@/types/Category';
import ReceiptUpload from '@/components/expenses/ReceiptUpload';

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
  const { tags } = useData();
  const { handleTagCreate } = useDataOperations();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isCreatingTag, startTagCreation] = useTransition();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: expense
        ? formatCurrencyInput(expense.amount.toString().replace('.', ','))
        : '',
      description: expense?.description || '',
      category_id: expense?.category_id || 'none',
      tag_id: expense?.tag_id || undefined,
      date: expense ? new Date(expense.date) : new Date(),
    },
  });

  const selectedTagId = form.watch('tag_id');
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  const filteredTags = useMemo(() => {
    if (!tagSearch) return tags;
    const lower = tagSearch.toLowerCase();
    return tags.filter((t) => t.name.toLowerCase().includes(lower));
  }, [tags, tagSearch]);

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

  const handleSubmit = (values: ExpenseFormData) => {
    if (!session?.user?.id) return;

    const expenseData: Partial<Expense> = {
      amount: parseCurrencyInput(values.amount),
      description: values.description,
      category_id:
        values.category_id === 'none' ? undefined : values.category_id,
      tag_id: values.tag_id || undefined,
      date: format(values.date, 'yyyy-MM-dd'),
      user_id: session.user.id,
    };

    onSubmit(expenseData, expense?.id, {
      receiptFile,
      removeExistingReceipt,
      existingReceiptPath: expense?.receipt_path ?? null,
    });
    onClose();
  };

  return (
    <div className="flex flex-col max-h-full">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain" style={{ touchAction: 'pan-y' }}>
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    €
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
                    placeholder={t('expenses.descriptionPlaceholder')}
                    {...field}
                    className="overflow-ellipsis"
                    aria-label={t('expenses.descriptionLabel')}
                  />
                </FormControl>
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
                      <SelectValue placeholder={t('expenses.selectCategory')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="max-h-[300px]">
                    <SelectItem value="none">
                      {t('expenses.noCategory')}
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                            aria-hidden="true"
                          />
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
                        {renderTagButtonContent(selectedTag)}
                        {renderTagClearButton(selectedTag, handleTagClear)}
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
                            if (filteredTags.length === 1 && !showCreateOption) {
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
                      {renderNoTagsMessage(filteredTags.length, showCreateOption)}
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
                        {renderDateValue(field.value, dateLocale, t('expenses.pickDate'))}
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

          <ReceiptUpload
            currentReceiptPath={expense?.receipt_path}
            selectedFile={receiptFile}
            isRemoving={removeExistingReceipt}
            onFileSelect={setReceiptFile}
            onRemoveExisting={() => setRemoveExistingReceipt(true)}
          />

          <div className="flex gap-3 justify-end pt-2 pb-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {t('expenses.saveExpense')}
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

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

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

const renderTagButtonContent = (
  selectedTag: { name: string; color: string } | undefined,
) => {
  if (!selectedTag) {
    return (
      <span className="flex items-center gap-2">
        <Tag className="h-4 w-4" />
        No tag
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: selectedTag.color }}
      />
      {selectedTag.name}
    </span>
  );
};

const renderTagClearButton = (
  selectedTag: { name: string; color: string } | undefined,
  onClear: () => void,
) => {
  if (!selectedTag) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClear();
  };

  return (
    <button
      type="button"
      aria-label="Clear tag"
      className="ml-auto p-1 -mr-1 shrink-0 opacity-50 hover:opacity-100 rounded-full"
      onClick={handleClick}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
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
      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary"
      onClick={onCreate}
      disabled={isCreatingTag}
    >
      <Tag className="h-3 w-3 shrink-0" />
      {label}
    </button>
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
