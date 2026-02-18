import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Check } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useData } from '@/contexts/DataContext';
import { categorySchema, type CategoryFormData } from '@/lib/validations';

// Tailwind 500-weight palette — vivid enough to pop at small sizes,
// refined enough to look modern across light and dark themes.
export const CATEGORY_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
] as const;

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

interface CategoryFormProps {
  onBack: () => void;
  onClose: () => void;
}

const CategoryForm = ({ onBack, onClose }: CategoryFormProps) => {
  const { session } = useAuth();
  const { handleCategoryAdd } = useDataOperations();
  const { isInitialized } = useData();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      color: DEFAULT_CATEGORY_COLOR,
    },
  });

  const handleSubmit = async (values: CategoryFormData) => {
    if (!canSubmitForm(session, isInitialized)) {
      return;
    }

    if (!session) {
      return;
    }

    try {
      await handleCategoryAdd({
        name: values.name,
        color: values.color,
        user_id: session.user.id,
      });
      onClose();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const isDisabled = getIsFormDisabled(
    form.formState.isSubmitting,
    isInitialized,
  );
  const submitButtonText = getSubmitButtonText(form.formState.isSubmitting);

  return (
    <div className="flex flex-col max-h-full">
      {/* Mobile drag handle */}
      <div
        className="flex justify-center pt-3 pb-2 sm:hidden"
        data-drag-handle
      >
        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
      </div>

      {/* Scrollable content */}
      <div
        className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-2 overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <DialogHeader className="pb-4" data-draggable-area>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
              disabled={isDisabled}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
            <DialogTitle className="text-xl">Add New Category</DialogTitle>
          </div>
          <DialogDescription>
            Create a new category to organize your expenses
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 pb-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Category Name"
                      {...field}
                      disabled={isDisabled}
                      aria-label="Category name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Color</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-8 gap-2 pt-1">
                      {CATEGORY_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => field.onChange(color)}
                          disabled={isDisabled}
                          aria-label={`Select color ${color}`}
                          className={cn(
                            'w-9 h-9 rounded-full transition-all duration-150 flex items-center justify-center',
                            field.value === color
                              ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                              : 'opacity-70 hover:opacity-100 hover:scale-105',
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {renderSwatchCheck(field.value === color)}
                        </button>
                      ))}
                    </div>
                  </FormControl>

                  {/* Preview */}
                  <div className="flex items-center gap-3 pt-2">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 transition-colors duration-150"
                      style={{ backgroundColor: field.value }}
                    />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {field.value}
                    </span>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-2 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isDisabled}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isDisabled}>
                {submitButtonText}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

const renderSwatchCheck = (isSelected: boolean) => {
  if (!isSelected) return null;
  return <Check className="h-3.5 w-3.5 text-white drop-shadow" />;
};

const canSubmitForm = (
  session: Session | null,
  isInitialized: boolean,
): boolean => {
  if (!session?.user?.id) {
    return false;
  }

  if (!isInitialized) {
    return false;
  }

  return true;
};

const getIsFormDisabled = (
  isSubmitting: boolean,
  isInitialized: boolean,
): boolean => {
  if (isSubmitting) {
    return true;
  }

  if (!isInitialized) {
    return true;
  }

  return false;
};

const getSubmitButtonText = (isSubmitting: boolean): string => {
  if (isSubmitting) {
    return 'Adding...';
  }

  return 'Add Category';
};

export default CategoryForm;
