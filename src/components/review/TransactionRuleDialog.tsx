import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { transactionRuleSchema } from '@/lib/validations';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { TransactionRuleDraft } from '@/types/TransactionRule';

type Values = z.infer<typeof transactionRuleSchema>;
type Props = {
  transaction: Expense;
  categories: Category[];
  onSave: (draft: TransactionRuleDraft) => Promise<boolean>;
  onClose: () => void;
};

const TransactionRuleDialog = ({
  transaction,
  categories,
  onSave,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const form = useForm<Values>({
    resolver: zodResolver(transactionRuleSchema),
    mode: 'onChange',
    defaultValues: buildDefaults(transaction),
  });
  const submit = form.handleSubmit(async (values) => {
    const saved = await onSave(toDraft(values));
    if (saved) {
      onClose();
    }
  });

  return (
    <Dialog open onOpenChange={(open) => handleOpenChange(open, onClose)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('review.rule.title')}</DialogTitle>
          <DialogDescription>{t('review.rule.description')}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {renderMatchFields(form, t)}
          {renderActionFields(form, categories, t)}
          {renderFormError(form.formState.errors.rename_to?.message, t)}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {getSubmitLabel(form.formState.isSubmitting, t)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionRuleDialog;

// --- Helpers ---

type Form = ReturnType<typeof useForm<Values>>;
type TFunc = ReturnType<typeof useTranslation>['t'];

const buildDefaults = (transaction: Expense): Values => ({
  match_type: 'exact',
  match_value: transaction.merchant_name ?? transaction.description,
  transaction_type: getTransactionType(transaction),
  rename_to: transaction.merchant_name ?? transaction.description,
  category_id: transaction.category_id ?? '',
  tag_id: transaction.tag_id ?? '',
});

const getTransactionType = (transaction: Expense): 'expense' | 'income' => {
  if (transaction.type === 'income') {
    return 'income';
  }

  return 'expense';
};

const renderMatchFields = (form: Form, t: TFunc) => (
  <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
    <div className="space-y-1.5">
      <Label htmlFor="rule-match-type">{t('review.rule.matchType')}</Label>
      <select
        id="rule-match-type"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...form.register('match_type')}
      >
        <option value="exact">{t('review.rule.exact')}</option>
        <option value="contains">{t('review.rule.contains')}</option>
      </select>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="rule-match-value">{t('review.rule.statementText')}</Label>
      <Input id="rule-match-value" {...form.register('match_value')} />
      {renderFormError(form.formState.errors.match_value?.message, t)}
    </div>
  </div>
);

const renderActionFields = (form: Form, categories: Category[], t: TFunc) => (
  <div className="space-y-3 rounded-lg border border-border/50 p-3">
    <p className="text-xs font-semibold text-muted-foreground">
      {t('review.rule.then')}
    </p>
    <div className="space-y-1.5">
      <Label htmlFor="rule-merchant">{t('review.rule.merchant')}</Label>
      <Input id="rule-merchant" {...form.register('rename_to')} />
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="rule-category">{t('review.rule.category')}</Label>
      <select
        id="rule-category"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...form.register('category_id')}
      >
        <option value="">{t('review.rule.keepCategory')}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  </div>
);

const renderFormError = (message: string | undefined, t: TFunc) => {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive-ink">{t(message)}</p>;
};

const toDraft = (values: Values): TransactionRuleDraft => ({
  match_type: values.match_type,
  match_value: values.match_value,
  transaction_type: values.transaction_type,
  rename_to: emptyToNull(values.rename_to),
  category_id: emptyToNull(values.category_id),
  tag_id: emptyToNull(values.tag_id),
});

const emptyToNull = (value: string): string | null => {
  if (value === '') {
    return null;
  }

  return value;
};

const getSubmitLabel = (isSubmitting: boolean, t: TFunc): string => {
  if (isSubmitting) {
    return t('review.rule.saving');
  }

  return t('review.rule.save');
};

const handleOpenChange = (open: boolean, onClose: () => void): void => {
  if (!open) {
    onClose();
  }
};
