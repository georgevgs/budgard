import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN } from '@/constants/validations';

// Budget validation schema
export const budgetSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 10000000;
    }, 'validation.amountMax10M'),
});

export type BudgetFormData = z.infer<typeof budgetSchema>;
