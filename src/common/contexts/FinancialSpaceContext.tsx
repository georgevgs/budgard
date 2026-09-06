import { createContext, useContext } from 'react';
import type { FinancialSpace, HouseholdShare } from '@/types/Household';

export type FinancialSpaceContextValue = {
  activeOwnerId: string;
  activeSpace: FinancialSpace;
  spaces: FinancialSpace[];
  shares: HouseholdShare[];
  pendingInvites: HouseholdShare[];
  isLoading: boolean;
  error: Error | null;
  selectSpace: (ownerId: string) => void;
  refreshShares: () => Promise<void>;
  createInvite: (email: string) => Promise<HouseholdShare>;
  acceptInvite: (token: string) => Promise<HouseholdShare>;
  revokeShare: () => Promise<void>;
  leaveShare: (ownerId: string) => Promise<void>;
};

export const FinancialSpaceContext =
  createContext<FinancialSpaceContextValue | null>(null);

export const useFinancialSpace = () => {
  const context = useContext(FinancialSpaceContext);
  if (!context) {
    throw new Error(
      'useFinancialSpace must be used within a FinancialSpaceProvider',
    );
  }

  return context;
};
