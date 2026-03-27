import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock auth module
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
  onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
}));

import { useAuth } from './useAuth';

describe('useAuth', () => {
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
  });

  it('resolves to unauthenticated when no session', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('resolves to authenticated when session exists', async () => {
    const session = { user: { id: 'u1', email: 'test@test.com' }, access_token: 'tok' };
    mockGetSession.mockResolvedValue({ data: { session } });

    const { result } = renderHook(() => useAuth());

    await act(async () => {});

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session).toEqual(session);
  });

  it('subscribes to auth state changes', () => {
    renderHook(() => useAuth());
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('updates session when auth state changes', async () => {
    let authCallback: ((session: unknown) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb: (session: unknown) => void) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {});

    const newSession = { user: { id: 'u2' }, access_token: 'new-tok' };
    act(() => {
      authCallback!(newSession);
    });

    expect(result.current.session).toEqual(newSession);
  });
});
