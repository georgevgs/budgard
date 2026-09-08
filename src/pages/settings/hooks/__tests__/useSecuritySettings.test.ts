import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AppLockRecord } from '@/constants/appLock';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/common/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

const mockSignOutEverywhere = vi.hoisted(() => vi.fn());
vi.mock('@/common/api/authApi', () => ({
  authApi: { signOutEverywhere: mockSignOutEverywhere },
}));

const mockClearLock = vi.hoisted(() => vi.fn());
const mockIsLockEnabled = vi.hoisted(() => vi.fn());
const mockLoadLock = vi.hoisted(() => vi.fn());
const mockSetBiometrics = vi.hoisted(() => vi.fn());
vi.mock('@/constants/appLock', () => ({
  clearLock: mockClearLock,
  isLockEnabled: mockIsLockEnabled,
  loadLock: mockLoadLock,
  setBiometrics: mockSetBiometrics,
}));

const mockEnrolDeviceUnlock = vi.hoisted(() => vi.fn());
const mockForgetDeviceUnlock = vi.hoisted(() => vi.fn());
const mockIsDeviceUnlockSupported = vi.hoisted(() => vi.fn());
vi.mock('@/constants/deviceUnlock', () => ({
  enrolDeviceUnlock: mockEnrolDeviceUnlock,
  forgetDeviceUnlock: mockForgetDeviceUnlock,
  isDeviceUnlockSupported: mockIsDeviceUnlockSupported,
}));

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/useToast', () => ({ toast: mockToast }));

import { useSecuritySettings } from '@/pages/settings/hooks/useSecuritySettings';

const lock = (over: Partial<AppLockRecord> = {}): AppLockRecord => ({
  salt: 'ab',
  hash: 'cd',
  biometrics: false,
  failedAttempts: 0,
  lockedUntil: null,
  ...over,
});

const render = async () => {
  const rendered = renderHook(() => useSecuritySettings());
  await act(async () => {});

  return rendered;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ session: { user: { id: 'user-1' } } });
  mockIsLockEnabled.mockReturnValue(false);
  mockLoadLock.mockReturnValue(null);
  mockIsDeviceUnlockSupported.mockResolvedValue(false);
  mockEnrolDeviceUnlock.mockResolvedValue(true);
  mockSignOutEverywhere.mockResolvedValue(undefined);
});

describe('useSecuritySettings', () => {
  it('opens on whatever the stored lock says', async () => {
    mockIsLockEnabled.mockReturnValue(true);
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));

    const { result } = await render();

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.usesDevice).toBe(true);
  });

  it('asks the platform whether a device unlock is possible', async () => {
    mockIsDeviceUnlockSupported.mockResolvedValue(true);

    const { result } = await render();

    expect(result.current.isDeviceSupported).toBe(true);
  });

  it('turning the lock on opens the PIN dialog rather than enabling anything', async () => {
    const { result } = await render();

    act(() => result.current.handleToggle(true));

    expect(result.current.isSettingPin).toBe(true);
    expect(result.current.isEnabled).toBe(false);
    expect(mockClearLock).not.toHaveBeenCalled();
  });

  it('turning the lock off clears the PIN and the device credential together', async () => {
    mockIsLockEnabled.mockReturnValue(true);
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    const { result } = await render();

    act(() => result.current.handleToggle(false));

    expect(mockClearLock).toHaveBeenCalled();
    expect(mockForgetDeviceUnlock).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.usesDevice).toBe(false);
  });

  it('a saved PIN enables the lock, closes the dialog and says so', async () => {
    const { result } = await render();
    act(() => result.current.handleToggle(true));

    act(() => result.current.handlePinSaved());

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isSettingPin).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'success',
      title: 'security.lockToggle.saved',
    });
  });

  it('enrols the device against the signed-in user', async () => {
    const { result } = await render();

    await act(async () => {
      await result.current.handleDeviceToggle(true);
    });

    expect(mockEnrolDeviceUnlock).toHaveBeenCalledWith('user-1');
    expect(mockSetBiometrics).toHaveBeenCalledWith(true);
    expect(result.current.usesDevice).toBe(true);
  });

  it('enrols under a stable name when there is no session to name', async () => {
    mockUseAuth.mockReturnValue({ session: null });
    const { result } = await render();

    await act(async () => {
      await result.current.handleDeviceToggle(true);
    });

    expect(mockEnrolDeviceUnlock).toHaveBeenCalledWith('budgard');
  });

  it('leaves the switch alone when the system prompt is dismissed', async () => {
    mockEnrolDeviceUnlock.mockResolvedValue(false);
    const { result } = await render();

    await act(async () => {
      await result.current.handleDeviceToggle(true);
    });

    expect(mockSetBiometrics).not.toHaveBeenCalled();
    expect(result.current.usesDevice).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: 'security.device.notEnrolled',
    });
  });

  it('turning device unlock off forgets the credential without touching the PIN', async () => {
    mockIsLockEnabled.mockReturnValue(true);
    mockLoadLock.mockReturnValue(lock({ biometrics: true }));
    const { result } = await render();

    await act(async () => {
      await result.current.handleDeviceToggle(false);
    });

    expect(mockForgetDeviceUnlock).toHaveBeenCalled();
    expect(mockSetBiometrics).toHaveBeenCalledWith(false);
    expect(result.current.usesDevice).toBe(false);
    expect(result.current.isEnabled).toBe(true);
    expect(mockClearLock).not.toHaveBeenCalled();
  });

  it('signing out everywhere drops the local lock before it goes', async () => {
    mockIsLockEnabled.mockReturnValue(true);
    const { result } = await render();
    act(() => result.current.setIsConfirmingSignOutAll(true));

    await act(async () => {
      await result.current.handleSignOutEverywhere();
    });

    expect(result.current.isConfirmingSignOutAll).toBe(false);
    expect(mockClearLock).toHaveBeenCalled();
    expect(mockForgetDeviceUnlock).toHaveBeenCalled();
    expect(mockSignOutEverywhere).toHaveBeenCalledOnce();
  });

  it('opens and closes the PIN dialog on demand', async () => {
    const { result } = await render();

    act(() => result.current.openPinDialog());
    expect(result.current.isSettingPin).toBe(true);

    act(() => result.current.closePinDialog());
    expect(result.current.isSettingPin).toBe(false);
  });
});
