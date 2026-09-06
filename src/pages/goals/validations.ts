import * as z from 'zod';
import { parseCurrencyInput } from '@/constants/utils';
import { AMOUNT_PATTERN, HEX_COLOR, SAFE_STRING } from '@/constants/validations';

// Goal validation schema
export const goalSchema = z
  .object({
    name: z
      .string()
      .min(1, 'validation.nameRequired')
      .max(80, 'validation.nameTooLong80')
      .regex(SAFE_STRING, 'validation.nameInvalid')
      .transform((s) => s.trim())
      .refine((s) => s.length > 0, 'validation.nameEmpty'),
    target_amount: z
      .string()
      .min(1, 'validation.targetRequired')
      .regex(AMOUNT_PATTERN, 'validation.amountInvalid')
      .refine((val) => {
        const amount = parseCurrencyInput(val);

        return amount > 0 && amount <= 10000000;
      }, 'validation.targetMax10M'),
    deadline: z.date().optional(),
    source_type: z.enum(['category', 'tag', 'net_delta', 'account'] as const),
    category_id: z.string().optional(),
    tag_id: z.string().optional(),
    linked_account_id: z.string().optional(),
    icon: z.string().min(1).max(40),
    color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
  })
  .refine((data) => data.source_type !== 'category' || !!data.category_id, {
    message: 'validation.goalCategoryRequired',
    path: ['category_id'],
  })
  .refine((data) => data.source_type !== 'tag' || !!data.tag_id, {
    message: 'validation.goalTagRequired',
    path: ['tag_id'],
  })
  .refine(
    (data) => data.source_type !== 'account' || !!data.linked_account_id,
    {
      message: 'validation.goalAccountRequired',
      path: ['linked_account_id'],
    },
  );

export type GoalFormData = z.infer<typeof goalSchema>;
