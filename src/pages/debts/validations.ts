import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, HEX_COLOR, SAFE_STRING } from '@/constants/validations';

// Debt validation schema. current_balance becomes original_principal in the DB
// at create time (most users only know what they owe today, not what they
// originally borrowed).
export const debtSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .max(80, 'validation.nameTooLong80')
    .regex(SAFE_STRING, 'validation.nameInvalid')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'validation.nameEmpty'),
  kind: z.enum([
    'credit_card',
    'student_loan',
    'mortgage',
    'auto_loan',
    'personal_loan',
    'medical',
    'other',
  ] as const),
  current_balance: z
    .string()
    .min(1, 'validation.balanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  apr: z
    .string()
    .min(1, 'validation.aprRequired')
    .refine((val) => {
      const num = Number(val.replace(',', '.'));

      return !Number.isNaN(num) && num >= 0 && num <= 100;
    }, 'validation.aprRange'),
  minimum_payment: z
    .string()
    .min(1, 'validation.minPaymentRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  currency: z.string().length(3, 'validation.currencyRequired'),
  payoff_target_date: z.date().optional(),
  icon: z.string().min(1).max(40),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
});

// Debt payment schema (creates an expense linked to the debt).
export const debtPaymentSchema = z.object({
  amount: z
    .string()
    .min(1, 'validation.amountRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount > 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  date: z.date({ error: 'validation.dateRequired' }),
  description: z
    .string()
    .max(200, 'validation.descriptionTooLong200')
    .regex(SAFE_STRING, 'validation.descriptionInvalid')
    .optional(),
});

export type DebtFormData = z.infer<typeof debtSchema>;

export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>;
