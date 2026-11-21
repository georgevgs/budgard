import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockHandleDailyReminderHourUpdate = vi.hoisted(() => vi.fn());
const mockHandleNotificationPreferenceUpdate = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/dataOps/useSettingsOps', () => ({
  useSettingsOps: () => ({
    handleDeleteAccount: vi.fn(),
    handleDailyReminderHourUpdate: mockHandleDailyReminderHourUpdate,
    handleNotificationPreferenceUpdate: mockHandleNotificationPreferenceUpdate,
  }),
}));

vi.mock('@/common/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/pages/settings/hooks/useAccentColor', () => ({
  useAccentColor: () => ({ accent: 'orange', setAccent: vi.fn() }),
}));

vi.mock('@/common/api/authApi', () => ({
  authApi: { signOut: vi.fn() },
}));

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/constants/haptics', () => ({
  haptics: { success: vi.fn(), selection: vi.fn() },
  hapticsSettings: { isEnabled: () => true, isSupported: () => true },
}));

import { useSettingsHandlers } from '@/pages/settings/hooks/useSettingsHandlers';

beforeEach(() => {
  vi.clearAllMocks();
  mockHandleDailyReminderHourUpdate.mockRejectedValue(new Error('offline'));
  mockHandleNotificationPreferenceUpdate.mockRejectedValue(
    new Error('offline'),
  );
});

describe('useSettingsHandlers write failures', () => {
  it('leaves the error toast to the runner when the reminder toggle fails', async () => {
    const { result } = renderHook(() => useSettingsHandlers());

    await expect(
      result.current.handleDailyReminderToggle(true),
    ).resolves.toBeUndefined();

    expect(mockHandleDailyReminderHourUpdate).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('leaves the error toast to the runner when the reminder time fails', async () => {
    const { result } = renderHook(() => useSettingsHandlers());

    await expect(
      result.current.handleDailyReminderTimeChange(8),
    ).resolves.toBeUndefined();

    expect(mockHandleDailyReminderHourUpdate).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('leaves the error toast to the runner when a preference toggle fails', async () => {
    const { result } = renderHook(() => useSettingsHandlers());

    await expect(
      result.current.handlePreferenceToggle('bill_reminders', true),
    ).resolves.toBeUndefined();

    expect(mockHandleNotificationPreferenceUpdate).toHaveBeenCalledTimes(1);
    expect(mockToast).not.toHaveBeenCalled();
  });
});
