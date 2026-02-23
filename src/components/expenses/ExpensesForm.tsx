import { useState, useMemo } from 'react';
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
import { CalendarIcon, Tag, X } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { cn, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/contexts/DataContext';
import { useDataOperations } from '@/hooks/useDataOperations';
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

interface ExpensesFormProps {
  expense?: Expense;
  categories: Category[];
  onClose: () => void;
}

const ExpensesForm = ({ expense, categories, onClose }: ExpensesFormProps) => {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { tags } = useData();
  const { handleExpenseSubmit, handleTagCreate } = useDataOperations();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

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

  const handleTagCreateInline = async () => {
    if (!tagSearch.trim() || isCreatingTag) return;
    setIsCreatingTag(true);
    try {
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      const newTag = await handleTagCreate(tagSearch.trim(), color);
      form.setValue('tag_id', newTag.id);
      setTagPopoverOpen(false);
      setTagSearch('');
    } catch {
      // error already shown via toast
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleSubmit = async (values: ExpenseFormData) => {
    if (!session?.user?.id) return;

    try {
      const expenseData: Partial<Expense> = {
        amount: parseCurrencyInput(values.amount),
        description: values.description,
        category_id:
          values.category_id === 'none' ? undefined : values.category_id,
        tag_id: values.tag_id || undefined,
        date: format(values.date, 'yyyy-MM-dd'),
        user_id: session.user.id,
      };

      await handleExpenseSubmit(expenseData, expense?.id, {
        receiptFile,
        removeExistingReceipt,
        existingReceiptPath: expense?.receipt_path ?? null,
      });
      onClose();
    } catch {
      // Error is handled by parent
    }
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
            {t(expense ? 'expenses.editExpense' : 'expenses.addExpense')}
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
                        {selectedTag && (
                          <span
                            role="button"
                            aria-label="Clear tag"
                            className="ml-auto h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTagClear();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                handleTagClear();
                              }
                            }}
                            tabIndex={0}
                          >
                            <X className="h-4 w-4" />
                          </span>
                        )}
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
                      {showCreateOption && (
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left text-primary"
                          onClick={handleTagCreateInline}
                          disabled={isCreatingTag}
                        >
                          <Tag className="h-3 w-3 shrink-0" />
                          {isCreatingTag
                            ? 'Creating...'
                            : `Create tag: "${tagSearch.trim()}"`}
                        </button>
                      )}
                      {filteredTags.length === 0 && !showCreateOption && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No tags found.
                        </p>
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
                        {field.value ? (
                          format(field.value, 'PPP', { locale: dateLocale })
                        ) : (
                          <span>{t('expenses.pickDate')}</span>
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
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? t('common.saving')
                : t('expenses.saveExpense')}
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </div>
  );
};

const renderTagButtonContent = (selectedTag: { name: string; color: string } | undefined) => {
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

export default ExpensesForm;
