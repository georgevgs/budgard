import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, SAFE_STRING, isNotFutureDated } from '@/constants/validations';

export const expenseDescriptionSchema = z
  .string()
  .min(1, 'validation.descriptionRequired')
  .max(100, 'validation.descriptionTooLong100')
  .regex(SAFE_STRING, 'validation.descriptionInvalid')
  .transform((str) => str.trim())
  .refine((str) => str.length > 0, 'validation.descriptionEmpty');

// Expense validation schema
export const expenseSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 1000000;
    }, 'validation.amountMax1M'),
  description: expenseDescriptionSchema,
  category_id: z.string(),
  tag_id: z.string().optional(),
  // Additional tags beyond the primary (Pro). The form enforces the free
  // tier's single-tag limit; the expense_tags table enforces it server-side.
  extra_tag_ids: z.array(z.string()).optional(),
  date: z
    .date({
      error: 'validation.dateRequired',
    })
    .refine(isNotFutureDated, 'validation.dateInFuture'),
});

// Types
export type ExpenseFormData = z.infer<typeof expenseSchema>;
