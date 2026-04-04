import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Session } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn, extractEmoji } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useDataOperations } from '@/hooks/useDataOperations';
import { useData } from '@/contexts/DataContext';
import { categorySchema, type CategoryFormData } from '@/lib/validations';
import type { Category } from '@/types/Category';

// Common expense-related emojis for quick category identification
export const CATEGORY_ICONS = [
  '🍔', '🛒', '🏠', '🚗', '🎬', '💊', '👕', '💡',
  '🎮', '✈️', '📱', '🎓', '💇', '🐾', '🎁', '☕',
  '🍕', '🍺', '🏋️', '💼', '🎵', '📚', '🧹', '👶',
] as const;

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
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f472b6', // pink-light
  '#fb923c', // orange-light
  '#64748b', // slate
  '#78716c', // stone
  '#a8a29e', // warm-gray
  '#9ca3af', // cool-gray
  '#1e293b', // dark-navy
  '#334155', // slate-dark
] as const;

export const DEFAULT_CATEGORY_COLOR = '#6366f1';

type Props = {
  category?: Category;
  onBack: () => void;
  onClose: () => void;
};

const CategoryForm = ({ category, onBack, onClose }: Props) => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { handleCategoryAdd, handleCategoryUpdate } = useDataOperations();
  const { isInitialized } = useData();

  const isEditing = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? DEFAULT_CATEGORY_COLOR,
      icon: category?.icon ?? undefined,
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
      if (isEditing) {
        await handleCategoryUpdate(category.id, {
          name: values.name,
          color: values.color,
          icon: values.icon ?? null,
        });
      } else {
        await handleCategoryAdd({
          name: values.name,
          color: values.color,
          icon: values.icon ?? null,
          user_id: session.user.id,
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const isDisabled = getIsFormDisabled(
    form.formState.isSubmitting,
    isInitialized,
  );

  return (
    <div className="flex flex-col max-h-full">
      {/* Mobile drag handle */}
      <div className="flex justify-center pt-3 pb-2 sm:hidden" data-drag-handle>
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
              <span className="sr-only">{t('common.cancel')}</span>
            </Button>
            <DialogTitle className="text-xl">
              {isEditing
                ? t('categories.editCategory')
                : t('categories.addCategory')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? t('categories.editDescription')
              : t('categories.addDescription')}
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
                      placeholder={t('categories.categoryName')}
                      {...field}
                      disabled={isDisabled}
                      aria-label={t('categories.categoryName')}
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
                  <FormLabel className="text-sm font-medium">
                    {t('categories.color')}
                  </FormLabel>
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

                  {/* Custom color input */}
                  <div className="flex items-center gap-2 pt-2">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 transition-colors duration-150"
                      style={{ backgroundColor: field.value }}
                    />
                    <Input
                      value={field.value}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                          field.onChange(value);
                        }
                      }}
                      disabled={isDisabled}
                      className="h-7 w-24 text-xs font-mono tabular-nums px-2"
                      maxLength={7}
                      aria-label={t('categories.customColor')}
                    />
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {t('categories.icon')}
                  </FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-8 gap-2 pt-1">
                      {CATEGORY_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            field.onChange(
                              field.value === emoji ? undefined : emoji,
                            )
                          }
                          disabled={isDisabled}
                          aria-label={`Select icon ${emoji}`}
                          className={cn(
                            'w-9 h-9 rounded-full transition-all duration-150 flex items-center justify-center text-lg',
                            field.value === emoji
                              ? 'ring-2 ring-offset-2 ring-foreground bg-accent scale-110'
                              : 'opacity-70 hover:opacity-100 hover:scale-105 hover:bg-accent/50',
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  {/* Custom emoji input — outside FormControl to avoid Radix event issues */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const emoji = extractEmoji(raw);
                        field.onChange(emoji || undefined);
                      }}
                      disabled={isDisabled}
                      placeholder={t('categories.customIcon')}
                      className="h-7 w-32 text-sm px-2"
                      maxLength={4}
                      aria-label={t('categories.customIcon')}
                    />
                    {field.value ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => field.onChange(undefined)}
                        disabled={isDisabled}
                      >
                        {t('common.clear')}
                      </Button>
                    ) : null}
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isDisabled}>
                {getSubmitButtonText(form.formState.isSubmitting, isEditing, t)}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CategoryForm;

// ─── Helper functions ────────────────────────────────────────────────────────

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

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const getSubmitButtonText = (
  isSubmitting: boolean,
  isEditing: boolean,
  t: TFunc,
): React.ReactNode => {
  if (isSubmitting) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('common.saving')}
      </>
    );
  }

  if (isEditing) {
    return t('common.update');
  }

  return t('common.add');
};
