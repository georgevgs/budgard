import { supabase } from '@/lib/supabase';

export type FeedbackKind = 'feedback' | 'bug';

type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  route: string;
  appVersion: string;
};

export const feedbackService = {
  async create(input: FeedbackInput): Promise<void> {
    const { error } = await supabase.from('feedback_reports').insert({
      kind: input.kind,
      message: input.message,
      route: input.route,
      app_version: input.appVersion,
    });

    if (error) {
      throw error;
    }
  },
};
