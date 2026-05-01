import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
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
import CategoryColorPicker from '@/components/categories/CategoryColorPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { cn, formatCurrencyInput } from '@/lib/utils';
import { goalSchema, type GoalFormData } from '@/lib/validations';
import type { Goal, GoalSourceType } from '@/types/Goal';

const sourceValues = ['category', 'tag', 'net_delta'] as const;
const DEFAULT_GOAL_COLOR = '#f97316';
const DEFAULT_GOAL_ICON = 'target';

type Props = {
  goal?: Goal;
  onSubmit: (values: GoalFormData) => Promise<void>;
  onClose: () => void;
}

const GoalForm = ({ goal, onSubmit, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { expenseCategories, tags } = useData();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name ?? '',
      target_amount: goal
        ? formatCurrencyInput(goal.target_amount.toString().replace('.', ','))
        : '',
      deadline: goal?.deadline ? parseISO(goal.deadline) : undefined,
      source_type: goal?.source_type ?? 'net_delta',
      category_id: goal?.category_id ?? undefined,
      tag_id: goal?.tag_id ?? undefined,
      icon: goal?.icon ?? DEFAULT_GOAL_ICON,
      color: goal?.color ?? DEFAULT_GOAL_COLOR,
    },
  });

  const sourceType = form.watch('source_type');
  const isEditing = Boolean(goal);

  const handleSubmit = async (values: GoalFormData) => {
    if (!session?.user?.id) return;
    await onSubmit(values);
  };

  const isDeadlineDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date < today;
  };

  return (
    <div className="flex flex-col max-h-full">
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <DialogTitle className="text-xl">
            {renderTitle(isEditing, t)}
          </DialogTitle>
          <DialogDescription>
            {t('goals.formDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pb-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('goals.nameLabel')}</Label>
                  <FormControl>
                    <Input
                      placeholder={t('goals.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_amount"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('goals.targetLabel')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      €
                    </span>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          field.onChange(formatted);
                        }}
                        className="pl-7"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source_type"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('goals.sourceTypeLabel')}</Label>
                  <Select
                    onValueChange={(value: GoalSourceType) => {
                      field.onChange(value);
                      form.setValue('category_id', undefined);
                      form.setValue('tag_id', undefined);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sourceValues.map((source) => (
                        <SelectItem key={source} value={source}>
                          <div className="flex flex-col">
                            <span>{t(`goals.sources.${source}.label`)}</span>
                            <span className="text-xs text-muted-foreground">
                              {t(`goals.sources.${source}.description`)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {renderCategoryField(sourceType, form, expenseCategories, t)}

            {renderTagField(sourceType, form, tags, t)}

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Label>{t('goals.deadlineFieldLabel')}</Label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {renderDateValue(
                            field.value,
                            t('goals.noDeadline'),
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={isDeadlineDisabled}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('goals.colorLabel')}</Label>
                  <FormControl>
                    <CategoryColorPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 pb-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {renderSubmitLabel(form.formState.isSubmitting, isEditing, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default GoalForm;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

type GoalFormReturn = ReturnType<typeof useForm<GoalFormData>>;

const renderTitle = (isEditing: boolean, t: TranslateFunction) => {
  if (isEditing) return t('goals.editTitle');

  return t('goals.createTitle');
}

const renderDateValue = (date: Date | undefined, placeholder: string) => {
  if (!date) return <span>{placeholder}</span>;

  return format(date, 'MMM d, yyyy');
}

const renderSubmitLabel = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TranslateFunction,
): ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) return t('common.update');

  return t('goals.create');
}

const renderCategoryField = (
  sourceType: GoalSourceType,
  form: GoalFormReturn,
  categories: { id: string; name: string; color: string }[],
  t: TranslateFunction,
) => {
  if (sourceType !== 'category') return null;

  return (
    <FormField
      control={form.control}
      name="category_id"
      render={({ field }) => (
        <FormItem>
          <Label>{t('goals.categoryLabel')}</Label>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('goals.selectCategory')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
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
  );
}

const renderTagField = (
  sourceType: GoalSourceType,
  form: GoalFormReturn,
  tags: { id: string; name: string; color: string }[],
  t: TranslateFunction,
) => {
  if (sourceType !== 'tag') return null;

  return (
    <FormField
      control={form.control}
      name="tag_id"
      render={({ field }) => (
        <FormItem>
          <Label>{t('goals.tagLabel')}</Label>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('goals.selectTag')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
