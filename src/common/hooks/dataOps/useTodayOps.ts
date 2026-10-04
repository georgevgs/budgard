import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { dataService } from '@/common/api/dataService';
import { useMutationRunner } from '@/common/hooks/dataOps/useMutationRunner';
import { isOfflineError } from '@/constants/offlineError';
import type { TodayLayout } from '@/pages/today/utils/bentoLayout';

type LayoutSave = {
  getLayout: () => TodayLayout;
  onSaved: (layout: TodayLayout) => void;
  onPending: (layout: TodayLayout) => void;
};

export const useTodayOps = () => {
  const { t } = useTranslation();
  const runMutation = useMutationRunner();

  const saveLayout = useCallback(
    ({ getLayout, onSaved, onPending }: LayoutSave) =>
      runMutation({
        operation: 'saveTodayLayout',
        errorMessage: t('today.arrange.sessionHint'),
        successHaptic: 'none',
        // The local copy is durable. Keep it pending instead of rolling it
        // back, and reserve error toasts for failures that need attention.
        offlineFallback: async (error) => isOfflineError(error),
        perform: async () => {
          // A toast retry must read today's arrangement, not the snapshot
          // from before the user made another edit.
          const layout = getLayout();
          try {
            await dataService.saveLayout(layout);
          } catch (error) {
            onPending(layout);
            throw error;
          }

          return layout;
        },
        commit: onSaved,
      }),
    [runMutation, t],
  );

  return { saveLayout };
};
