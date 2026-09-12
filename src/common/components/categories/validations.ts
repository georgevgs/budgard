import * as z from 'zod';
import { HEX_COLOR, SAFE_STRING } from '@/constants/validations';

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'validation.categoryNameRequired')
    .max(50, 'validation.categoryNameTooLong')
    .regex(SAFE_STRING, 'validation.categoryNameInvalid')
    .transform((str) => str.trim())
    .refine((str) => str.length > 0, 'validation.categoryNameEmpty'),
  color: z.string().regex(HEX_COLOR, 'validation.colorInvalid'),
  // Preserve the existing UTF-16 limit after Zod switched to code-point lengths.
  icon: z
    .string()
    .refine((icon) => icon.length <= 4, 'validation.iconTooLong')
    .optional(),
  kind: z.enum(['need', 'want', 'savings'] as const).optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
