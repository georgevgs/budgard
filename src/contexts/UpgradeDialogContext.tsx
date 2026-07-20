import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Global open/close state for the single app-wide UpgradeDialog instance, so
// any gated feature can summon the upgrade flow without prop drilling.
type UpgradeDialogContextType = {
  isUpgradeOpen: boolean;
  openUpgrade: () => void;
  closeUpgrade: () => void;
};

const UpgradeDialogContext = createContext<UpgradeDialogContextType | null>(null);

export const UpgradeDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const value = useMemo(
    () => ({
      isUpgradeOpen,
      openUpgrade: () => setIsUpgradeOpen(true),
      closeUpgrade: () => setIsUpgradeOpen(false),
    }),
    [isUpgradeOpen],
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
