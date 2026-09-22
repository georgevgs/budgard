import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinancialSpaceProvider } from '@/common/contexts/FinancialSpaceProvider';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { householdService } from '@/common/api/householdService';
import type { HouseholdShare } from '@/types/Household';

const USER_ID = 'user-123';
const SHARED_OWNER_ID = 'owner-456';

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: USER_ID, email: 'member@example.com' } },
  }),
}));

vi.mock('@/common/api/householdService', () => ({
  householdService: {
    getVisibleShares: vi.fn(),
    createInvite: vi.fn(),
    acceptInvite: vi.fn(),
    revokeShare: vi.fn(),
    leaveShare: vi.fn(),
  },
}));

const sharedSpace: HouseholdShare = {
  id: 'share-1',
  owner_id: SHARED_OWNER_ID,
  member_id: USER_ID,
  owner_email: 'owner@example.com',
  invite_email: 'member@example.com',
  invite_token: 'token',
  status: 'accepted',
  accepted_at: '2026-09-01T00:00:00Z',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const Consumer = () => {
  const { activeOwnerId, isLoading, error, refreshShares } =
    useFinancialSpace();

  return (
    <div>
      <p>{`${activeOwnerId}:${String(isLoading)}`}</p>
      <p>{error ? 'space-error' : 'space-ready'}</p>
      <button type="button" onClick={() => void refreshShares()}>
        retry
      </button>
    </div>
  );
};

describe('FinancialSpaceProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(householdService.getVisibleShares).mockReset();
  });

  it('restores the saved space on the first render and validates it', async () => {
    localStorage.setItem(
      `budgard-active-financial-space:${USER_ID}`,
      SHARED_OWNER_ID,
    );
    vi.mocked(householdService.getVisibleShares).mockResolvedValue([
      sharedSpace,
    ]);

    render(
      <FinancialSpaceProvider>
        <Consumer />
      </FinancialSpaceProvider>,
    );

    expect(screen.getByText(`${SHARED_OWNER_ID}:true`)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(`${SHARED_OWNER_ID}:false`)).toBeInTheDocument();
    });
  });

  it('clears a validation error when retrying the saved space succeeds', async () => {
    localStorage.setItem(
      `budgard-active-financial-space:${USER_ID}`,
      SHARED_OWNER_ID,
    );
    vi.mocked(householdService.getVisibleShares)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce([sharedSpace]);

    render(
      <FinancialSpaceProvider>
        <Consumer />
      </FinancialSpaceProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('space-error')).toBeInTheDocument();
    });
    expect(screen.getByText(`${SHARED_OWNER_ID}:false`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    await waitFor(() => {
      expect(screen.getByText('space-ready')).toBeInTheDocument();
    });
    expect(householdService.getVisibleShares).toHaveBeenCalledTimes(2);
  });
});
