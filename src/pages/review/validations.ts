import * as z from 'zod';

export const transactionRuleSchema = z
  .object({
    match_type: z.enum(['exact', 'contains'] as const),
    match_value: z
      .string()
      .min(1, 'validation.ruleMatchRequired')
      .max(200, 'validation.ruleMatchTooLong')
      .transform((value) => value.trim())
      .refine((value) => value.length > 0, 'validation.ruleMatchRequired'),
    transaction_type: z.enum(['any', 'expense', 'income'] as const),
    rename_to: z
      .string()
      .max(100, 'validation.descriptionTooLong100')
      .transform((value) => value.trim()),
    category_id: z.string(),
    tag_id: z.string(),
  })
  .refine(
    (value) =>
      value.rename_to.length > 0 ||
      value.category_id.length > 0 ||
      value.tag_id.length > 0,
    {
      message: 'validation.ruleActionRequired',
      path: ['rename_to'],
    },
  );
