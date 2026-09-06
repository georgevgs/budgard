import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, HEX_COLOR, SAFE_STRING } from '@/constants/validations';

// Account validation schema
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'validation.nameRequired')
    .max(60, 'validation.nameTooLong60')
    .regex(SAFE_STRING, 'validation.nameInvalid')
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'validation.nameEmpty'),
  kind: z.enum([
    'cash',
    'bank',
    'credit_card',
    'loan',
    'investment',
    'other',
  ] as const),
  default_currency: z.string().length(3, 'validation.currencyRequired'),
  initial_balance: z
    .string()
    .min(1, 'validation.startingBalanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
});

// Balance snapshot schema. balance is the new current value;
// contribution_delta is meaningful only for investment accounts
// (signed: positive = deposit, negative = withdrawal).
export const accountBalanceSchema = z.object({
  balance: z
    .string()
    .min(1, 'validation.balanceRequired')
    .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
    .refine((val) => {
      const amount = parseCurrencyInput(val);

      return amount >= 0 && amount <= 100000000;
    }, 'validation.amountMax100M'),
  contribution_delta: z
    .string()
    .optional()
    .refine(
      (val) => !val || AMOUNT_PATTERN.test(val.replace(/^-/, '')),
      'validation.amountInvalid',
    ),
  recorded_at: z.date({
    error: 'validation.dateRequired',
  }),
  note: z
    .string()
    .max(200, 'validation.noteTooLong')
    .regex(SAFE_STRING, 'validation.noteInvalid')
    .optional(),
});

export type AccountFormData = z.infer<typeof accountSchema>;

export type AccountBalanceFormData = z.infer<typeof accountBalanceSchema>;
