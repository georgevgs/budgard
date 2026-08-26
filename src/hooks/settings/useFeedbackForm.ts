import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFeedbackOps } from '@/hooks/dataOps/useFeedbackOps';
import { feedbackFormSchema, type FeedbackFormData } from '@/lib/validations';
import type { FeedbackKind } from '@/services/feedbackService';

type Params = {
  kind: FeedbackKind;
  onSubmitted: () => void;
};

export const useFeedbackForm = ({ kind, onSubmitted }: Params) => {
  const { pathname } = useLocation();
  const { submitFeedback } = useFeedbackOps();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    mode: 'onChange',
    defaultValues: { message: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      await submitFeedback({ kind, message: values.message, route: pathname });
      form.reset();
      onSubmitted();
    } catch {
      // The operation hook reports the failure; leave the draft in place so
      // Retry costs one tap rather than retyping the report.
    } finally {
      setIsSubmitting(false);
    }
  });

  return { form, isSubmitting, submit };
};
