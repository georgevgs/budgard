import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/common/contexts/AuthContext';
import {
  FinancialSpaceContext,
  type FinancialSpaceContextValue,
} from '@/common/contexts/FinancialSpaceContext';
import { householdService } from '@/common/api/householdService';
import type { FinancialSpace, HouseholdShare } from '@/types/Household';

type FinancialSpaceProviderProps = {
  children: ReactNode;
};

export const FinancialSpaceProvider = ({
  children,
}: FinancialSpaceProviderProps) => {
  const { session } = useAuth();
  const user = getSpaceUser(session);
  const userId = user.id;
  const email = user.email ?? '';
  const state = useFinancialSpaceState(userId, email);
  const value: FinancialSpaceContextValue = {
    ...state,
    activeSpace: findActiveSpace(state.spaces, state.activeOwnerId),
    pendingInvites: findPendingInvites(userId, state.shares),
    ...buildOperations(state.refreshShares),
  };

  return (
    <FinancialSpaceContext.Provider value={value}>
      {children}
    </FinancialSpaceContext.Provider>
  );
};

const STORAGE_PREFIX = 'budgard-active-financial-space';

const getSpaceUser = (session: ReturnType<typeof useAuth>['session']) => {
  if (null === session) {
    return { id: '', email: '' };
  }

  return session.user;
};

type ShareLoadState =
  | { status: 'loading' | 'ready'; error: null }
  | { status: 'error'; error: Error };

const useFinancialSpaceState = (userId: string, email: string) => {
  const [shares, setShares] = useState<HouseholdShare[]>([]);
  const [activeOwnerId, setActiveOwnerId] = useState(() =>
    loadStoredOwner(userId),
  );
  const [shareLoad, setShareLoad] = useState<ShareLoadState>({
    status: 'loading',
    error: null,
  });
  const request = useRef<AbortController | null>(null);
  const [stateUserId, setStateUserId] = useState(userId);
  if (stateUserId !== userId) {
    setStateUserId(userId);
    setShares([]);
    setActiveOwnerId(loadStoredOwner(userId));
    setShareLoad({ status: 'loading', error: null });
  }
  const spaces = buildSpaces(userId, email, shares);

  const refreshShares = useCallback(() => {
    if ('' !== userId) {
      const previous = request.current;
      if (null !== previous) {
        previous.abort();
      }
      const controller = new AbortController();
      request.current = controller;

      return householdService
        .getVisibleShares(controller.signal)
        .then((nextShares) => {
          if (false === controller.signal.aborted) {
            setShares(nextShares);
            setActiveOwnerId((current) =>
              resolveActiveOwner(userId, current, nextShares),
            );
            setShareLoad({ status: 'ready', error: null });
          }
        })
        .catch((caught: unknown) => {
          if (false === controller.signal.aborted) {
            setShareLoad({ status: 'error', error: toError(caught) });
          }
        });
    } else {
      return Promise.resolve();
    }
  }, [userId]);

  useEffect(() => {
    void refreshShares();
    window.addEventListener('online', refreshShares);

    return () => {
      window.removeEventListener('online', refreshShares);
      const controller = request.current;
      if (null !== controller) {
        controller.abort();
      }
    };
  }, [refreshShares]);

  const selectSpace = (ownerId: string) => {
    if (spaces.some((space) => space.ownerId === ownerId)) {
      setActiveOwnerId(ownerId);
      storeOwner(userId, ownerId);
    }
  };

  return {
    spaces,
    shares,
    activeOwnerId,
    isLoading: 'loading' === shareLoad.status,
    error: shareLoad.error,
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
