import { useMemo, useState, type ReactNode } from 'react';
import type { ProPlanId } from '@/lib/proPlans';
import { UpgradeDialogContext } from '@/contexts/UpgradeDialogContext';

export const UpgradeDialogProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
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
