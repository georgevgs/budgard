import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategoriesData, useTagsData } from '@/contexts/DataContext';
import type { GoalFormData } from '@/lib/validations';
import type { GoalSourceType } from '@/types/Goal';

const sourceValues = ['category', 'tag', 'net_delta'] as const;

type Props = {
  form: UseFormReturn<GoalFormData>;
  sourceType: GoalSourceType;
};

const GoalSourceFields = ({ form, sourceType }: Props) => {
  const { t } = useTranslation();
  const { expenseCategories } = useCategoriesData();
  const tags = useTagsData();

  return (
    <>
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
    </>
  );
};

export default GoalSourceFields;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const renderCategoryField = (
  sourceType: GoalSourceType,
  form: UseFormReturn<GoalFormData>,
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
  form: UseFormReturn<GoalFormData>,
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
