import { createContext, useContext } from 'react';
import type { ProPlanId } from '@/lib/proPlans';

// Global open/close state for the single app-wide UpgradeDialog instance, so
// any gated feature can summon the upgrade flow without prop drilling.
// preferredPlan lets callers that already know the user's choice (e.g. the
// landing page's Get Pro intent) open the dialog on that plan.
type UpgradeDialogContextType = {
  isUpgradeOpen: boolean;
  preferredPlan: ProPlanId;
  openUpgrade: (plan?: ProPlanId) => void;
  closeUpgrade: () => void;
};

// The provider component lives in UpgradeDialogProvider.tsx so this module
// exports no components and useUpgradeDialog keeps fast refresh.
export const UpgradeDialogContext =
  createContext<UpgradeDialogContextType | null>(null);

export const useUpgradeDialog = () => {
  const context = useContext(UpgradeDialogContext);
  if (!context) {
    throw new Error(
      'useUpgradeDialog must be used within an UpgradeDialogProvider',
    );
  }

  return context;
};
