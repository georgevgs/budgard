import { supabase } from '@/config/supabase';

export type ProductEventName =
  | 'app_opened'
  | 'today_ready'
  | 'monthly_position_opened'
  | 'onboarding_started'
  | 'onboarding_categories_submitted'
  | 'onboarding_first_expense_submitted'
  | 'onboarding_completed'
  | 'monthly_budget_saved'
  | 'recurring_expense_created'
  | 'quick_add_opened'
  | 'quick_add_submitted';

export type ProductEventInput = {
  name: ProductEventName;
  durationMs?: number;
  loadKind?: 'cold' | 'cached';
};

export const productEventService = {
  async create(input: ProductEventInput): Promise<void> {
    const { error } = await supabase.from('product_events').insert({
      event_name: input.name,
      app_version: __APP_VERSION__,
      duration_ms: normalizeDuration(input.durationMs),
      load_kind: input.loadKind ?? null,
    });

    if (error) {
      throw error;
    }
  },
};

// Metrics never block or alter the action they describe. Offline, denied and
// obsolete-client writes simply disappear instead of becoming product errors.
export const trackProductEvent = (input: ProductEventInput): void => {
  void productEventService.create(input).catch(() => undefined);
};

const normalizeDuration = (duration: number | undefined): number | null => {
  if (duration === undefined || !Number.isFinite(duration)) {
    return null;
  }

  return Math.min(Math.max(Math.round(duration), 0), 120000);
};
