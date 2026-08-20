import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { renderCategoryIndicator } from '@/components/expenses/ExpensesForm.helpers';
import type { Category } from '@/types/Category';
import type { ExpenseFormData } from '@/lib/validations';

// Sentinel option value. Not a category id, so it can never collide with one.
const MANAGE_VALUE = '__manage__';

type Props = {
  form: UseFormReturn<ExpenseFormData>;
  categories: Category[];
};

const ExpenseCategoryField = ({ form, categories }: Props) => {
  const { t } = useTranslation();
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  // Categories used to be created from the floating action button, ranked
  // alongside "Add expense" as if it were an equally common thing to do. The
  // moment you actually need a new one is while filing an expense that has no
  // home — so the door is here, at the bottom of the picker.
  const handleChange = (value: string, onChange: (next: string) => void) => {
    if (value === MANAGE_VALUE) {
      setIsManagerOpen(true);

      return;
    }

    onChange(value);
  };

  return (
    <>
      <FormField
        control={form.control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <Select
              onValueChange={(value) => handleChange(value, field.onChange)}
              defaultValue={field.value}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.selectCategory')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" className="max-h-[300px]">
                <SelectItem value="none">{t('expenses.noCategory')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      {renderCategoryIndicator(category)}
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem
                  value={MANAGE_VALUE}
                  className="mt-1 border-t border-border/40"
                >
                  <div className="flex items-center gap-2 text-primary-ink">
                    <Settings2 className="h-4 w-4" />
                    {t('categories.manageCategories')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
        <DialogContent
          className="gap-0 p-0 sm:max-w-[500px]"
          onOpenChange={setIsManagerOpen}
        >
          {renderManager(isManagerOpen)}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExpenseCategoryField;

// --- Helpers ---

const renderManager = (isOpen: boolean) => {
  if (!isOpen) {
    return null;
  }

  return <CategoryManager />;
};
