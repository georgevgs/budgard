import * as z from 'zod';

export const feedbackFormSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'validation.feedbackTooShort')
    .max(2000, 'validation.feedbackTooLong'),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;
