import { supabase } from '@/lib/supabase';
import { normalizeLayout, type TodayLayout } from '@/lib/bentoLayout';

type LayoutRow = {
  today_visible: string[];
  today_hidden: string[];
};

export const uiPreferencesService = {
  async getTodayLayout(): Promise<TodayLayout | null> {
    const { data, error } = await supabase
      .from('user_ui_preferences')
      .select('today_visible, today_hidden')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }

    const row = data as LayoutRow;

    return normalizeLayout({
      visible: row.today_visible,
      hidden: row.today_hidden,
    });
  },

  async saveTodayLayout(layout: TodayLayout): Promise<void> {
    const { error } = await supabase.from('user_ui_preferences').upsert(
      {
        today_visible: layout.visible,
        today_hidden: layout.hidden,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw error;
    }
  },
};
