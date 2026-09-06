import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, SAFE_STRING, isNotFutureDated } from '@/constants/validations';

// Income validation schema — same shape as expense for now
export const incomeSchema = z.object({
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
  date: z
    .date({
      error: 'validation.dateRequired',
    })
    .refine(isNotFutureDated, 'validation.dateInFuture'),
});

export type IncomeFormData = z.infer<typeof incomeSchema>;
