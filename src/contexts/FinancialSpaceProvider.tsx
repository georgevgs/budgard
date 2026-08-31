import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  FinancialSpaceContext,
  type FinancialSpaceContextValue,
} from '@/contexts/FinancialSpaceContext';
import { householdService } from '@/services/householdService';
import type { FinancialSpace, HouseholdShare } from '@/types/Household';

type Props = {
  children: ReactNode;
};

const FinancialSpaceProvider = ({ children }: Props) => {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const email = session?.user.email ?? '';
  const state = useFinancialSpaceState(userId, email);

  const value = useMemo<FinancialSpaceContextValue>(() => {
    const operations = buildOperations(state.refreshShares);

    return {
      activeOwnerId: state.activeOwnerId,
      activeSpace: findActiveSpace(state.spaces, state.activeOwnerId),
      spaces: state.spaces,
      shares: state.shares,
      pendingInvites: findPendingInvites(userId, state.shares),
      isLoading: state.isLoading,
      error: state.error,
      selectSpace: state.selectSpace,
      refreshShares: state.refreshShares,
      ...operations,
    };
  }, [state, userId]);

  return (
    <FinancialSpaceContext.Provider value={value}>
      {children}
    </FinancialSpaceContext.Provider>
  );
};

export default FinancialSpaceProvider;

// --- Helpers ---

const STORAGE_PREFIX = 'budgard-active-financial-space';

type FinancialSpaceState = {
  spaces: FinancialSpace[];
  shares: HouseholdShare[];
  activeOwnerId: string;
  isLoading: boolean;
  error: Error | null;
  selectSpace: (ownerId: string) => void;
  refreshShares: () => Promise<void>;
};

// Owns the shares/activeOwnerId/isLoading/error state and the effect that
// loads it. Split out of the component so the component itself stays under
// the CLAUDE.md line cap.
const useFinancialSpaceState = (
  userId: string,
  email: string,
): FinancialSpaceState => {
  const [shares, setShares] = useState<HouseholdShare[]>([]);
  const [activeOwnerId, setActiveOwnerId] = useState(userId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stateUserId, setStateUserId] = useState(userId);
  if (stateUserId !== userId) {
    setStateUserId(userId);
    setShares([]);
    setActiveOwnerId(loadStoredOwner(userId));
    setIsLoading(true);
    setError(null);
  }
  const spaces = useMemo(
    () => buildSpaces(userId, email, shares),
    [userId, email, shares],
  );

  const refreshShares = useCallback(async () => {
    if (!userId) {
      setShares([]);
      setIsLoading(false);

      return;
    }

    try {
      const next = await householdService.getVisibleShares();
      setShares(next);
      setError(null);
      setActiveOwnerId((current) => resolveActiveOwner(userId, current, next));
    } catch (caught) {
      setError(toError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    void householdService
      .getVisibleShares(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) {
          return;
        }
        setShares(next);
        setError(null);
        setActiveOwnerId((current) =>
          resolveActiveOwner(userId, current, next),
        );
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(toError(caught));
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  const selectSpace = useCallback(
    (ownerId: string) => {
      if (!spaces.some((space) => space.ownerId === ownerId)) {
        return;
      }
      setActiveOwnerId(ownerId);
      storeOwner(userId, ownerId);
    },
    [spaces, userId],
  );

  return {
    spaces,
    shares,
    activeOwnerId,
    isLoading,
    error,
    selectSpace,
    refreshShares,
  };
};

const buildSpaces = (
  userId: string,
  email: string,
  shares: HouseholdShare[],
): FinancialSpace[] => {
  const ownSpace = { ownerId: userId, label: email, isShared: false };
  const sharedSpaces = shares
    .filter(
      (share) => share.status === 'accepted' && share.member_id === userId,
    )
    .map((share) => ({
      ownerId: share.owner_id,
      label: share.owner_email,
      isShared: true,
    }));

  return [ownSpace, ...sharedSpaces];
};

const findPendingInvites = (
  userId: string,
  shares: HouseholdShare[],
): HouseholdShare[] =>
  shares.filter(
    (share) => share.status === 'pending' && share.owner_id !== userId,
  );

const resolveActiveOwner = (
  userId: string,
  current: string,
  shares: HouseholdShare[],
): string => {
  const isAvailable = buildSpaces(userId, '', shares).some(
    (space) => space.ownerId === current,
  );
  if (isAvailable) {
    return current;
  }

  storeOwner(userId, userId);

  return userId;
};

const findActiveSpace = (
  spaces: FinancialSpace[],
  activeOwnerId: string,
): FinancialSpace => {
  const active = spaces.find((space) => space.ownerId === activeOwnerId);
  if (active) {
    return active;
  }

  return spaces[0] ?? { ownerId: '', label: '', isShared: false };
};

const buildOperations = (
  refresh: () => Promise<void>,
): Pick<
  FinancialSpaceContextValue,
  'createInvite' | 'acceptInvite' | 'revokeShare' | 'leaveShare'
> => ({
  createInvite: async (email) => {
    const share = await householdService.createInvite(email);
    await refresh();

    return share;
  },
  acceptInvite: async (token) => {
    const share = await householdService.acceptInvite(token);
    await refresh();

    return share;
  },
  revokeShare: async () => {
    await householdService.revokeShare();
    await refresh();
  },
  leaveShare: async (ownerId) => {
    await householdService.leaveShare(ownerId);
    await refresh();
  },
});

const loadStoredOwner = (userId: string): string => {
  if (!userId) {
    return '';
  }

  try {
    return localStorage.getItem(`${STORAGE_PREFIX}:${userId}`) ?? userId;
  } catch {
    return userId;
  }
};

const storeOwner = (userId: string, ownerId: string): void => {
  if (!userId) {
    return;
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${userId}`, ownerId);
  } catch {
    // The active space still works for this session when storage is blocked.
  }
};

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  return new Error('Failed to load household spaces');
};
