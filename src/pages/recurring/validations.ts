import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, SAFE_STRING } from '@/constants/validations';

// Recurring expense validation schema
export const recurringExpenseSchema = z
  .object({
    amount: z
      .string()
      .min(1, 'validation.amountRequired')
      .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
      .refine((val) => {
        const amount = parseCurrencyInput(val);

        return amount > 0 && amount <= 1000000;
      }, 'validation.amountMax1M'),
    description: z
      .string()
      .min(1, 'validation.descriptionRequired')
      .max(100, 'validation.descriptionTooLong100')
      .regex(SAFE_STRING, 'validation.descriptionInvalid')
      .transform((str) => str.trim())
      .refine((str) => str.length > 0, 'validation.descriptionEmpty'),
    category_id: z.string(),
    frequency: z.enum([
      'weekly',
      'biweekly',
      'monthly',
      'quarterly',
      'yearly',
    ] as const),
    start_date: z
      .date({
        error: 'validation.startDateRequired',
      })
      .min(new Date('2000-01-01'), 'validation.startDateTooEarly'),
    end_date: z.date().optional(),
    linked_account_id: z.string().nullable().optional(),
  })
  .refine((data) => !data.end_date || data.end_date >= data.start_date, {
    message: 'validation.endDateBeforeStart',
    path: ['end_date'],
  });

export type RecurringExpenseFormData = z.infer<typeof recurringExpenseSchema>;
