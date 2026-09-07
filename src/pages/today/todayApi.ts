import { supabase } from '@/config/supabase';
import { done, maybeRow } from '@/common/api/supabaseCrud';
import { normalizeLayout, type TodayLayout } from '@/pages/today/utils/bentoLayout';

type LayoutRow = {
  today_visible: string[];
  today_hidden: string[];
};

// Supabase queries for Today, at the feature root so an audit of what this
// feature reads and writes is one file.
export const todayApi = {
  async getLayout(): Promise<TodayLayout | null> {
    const row = await maybeRow<LayoutRow>(
      supabase
        .from('user_ui_preferences')
        .select('today_visible, today_hidden')
        .maybeSingle(),
    );

    if (!row) {
      return null;
    }

    return normalizeLayout({
      visible: row.today_visible,
      hidden: row.today_hidden,
    });
  },

  async saveLayout(layout: TodayLayout): Promise<void> {
    await done(
      supabase.from('user_ui_preferences').upsert(
        {
          today_visible: layout.visible,
          today_hidden: layout.hidden,
        },
        { onConflict: 'user_id' },
      ),
    );
  },
};
