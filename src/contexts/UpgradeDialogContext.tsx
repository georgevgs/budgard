import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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

const UpgradeDialogContext = createContext<UpgradeDialogContextType | null>(null);

export const UpgradeDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [preferredPlan, setPreferredPlan] = useState<ProPlanId>('yearly');

  const value = useMemo(
    () => ({
      isUpgradeOpen,
      preferredPlan,
      openUpgrade: (plan?: ProPlanId) => {
        // Strict value check, not truthiness: call sites like
        // onClick={openUpgrade} pass a MouseEvent as the first argument.
        if (plan === 'monthly' || plan === 'yearly') {
          setPreferredPlan(plan);
        }
        setIsUpgradeOpen(true);
      },
      closeUpgrade: () => setIsUpgradeOpen(false),
    }),
    [isUpgradeOpen, preferredPlan],
  );

  return (
    <UpgradeDialogContext.Provider value={value}>
      {children}
    </UpgradeDialogContext.Provider>
  );
};

export const useUpgradeDialog = () => {
  const context = useContext(UpgradeDialogContext);
  if (!context) {
    throw new Error('useUpgradeDialog must be used within an UpgradeDialogProvider');
  }

  return context;
};
