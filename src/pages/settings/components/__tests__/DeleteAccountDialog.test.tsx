import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { email: 'me@test.com' } },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

vi.mock('@marsidev/react-turnstile', async () => {
  const { useEffect } = await import('react');

  return {
    Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
      useEffect(() => {
        onSuccess('turnstile-token');
      }, [onSuccess]);

      return <div data-testid="turnstile" />;
    },
  };
});

vi.mock('@/common/ui/input-otp', () => ({
  InputOTP: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      data-testid="otp-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
  InputOTPGroup: () => null,
  InputOTPSlot: () => null,
}));

vi.mock('@/common/api/authApi', () => ({
  authApi: {
    requestOTP: vi.fn(),
    signInWithOTP: vi.fn(),
  },
}));

import { authApi } from '@/common/api/authApi';
import { DeleteAccountDialog } from '@/pages/settings/components/DeleteAccountDialog';

const advanceToVerifyStep = async () => {
  vi.mocked(authApi.requestOTP).mockResolvedValue({ error: null } as never);

  const sendButton = await screen.findByRole('button', {
    name: 'settings.data.deleteAccountConfirmButton',
  });
  await waitFor(() => expect(sendButton).toBeEnabled());
  fireEvent.click(sendButton);

  await screen.findByText('settings.data.deleteAccountVerifyTitle');
};

describe('DeleteAccountDialog', () => {
  it('renders the confirm step with the re-auth notice when open', async () => {
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirmDelete={vi.fn()}
        isDeleting={false}
      />,
    );

    expect(
      screen.getByText('settings.data.deleteAccountConfirmTitle'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('settings.data.deleteAccountCodeNotice'),
    ).toBeInTheDocument();
  });

  it('requests an OTP with the Turnstile token and advances to verify', async () => {
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirmDelete={vi.fn()}
        isDeleting={false}
      />,
    );

    await advanceToVerifyStep();

    expect(authApi.requestOTP).toHaveBeenCalledWith('me@test.com', 'turnstile-token');
  });

  it('shows an error and keeps the account when the code is wrong', async () => {
    const onConfirmDelete = vi.fn();
    vi.mocked(authApi.signInWithOTP).mockResolvedValue({
      error: { message: 'invalid' },
    } as never);

    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirmDelete={onConfirmDelete}
        isDeleting={false}
      />,
    );

    await advanceToVerifyStep();

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123456' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'settings.data.deleteAccountVerifyButton',
      }),
    );

    await screen.findByText('auth.invalidCode');
    expect(onConfirmDelete).not.toHaveBeenCalled();
  });

  it('deletes the account and closes after a valid code', async () => {
    const onConfirmDelete = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    vi.mocked(authApi.signInWithOTP).mockResolvedValue({ error: null } as never);

    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirmDelete={onConfirmDelete}
        isDeleting={false}
      />,
    );

    await advanceToVerifyStep();

    fireEvent.change(screen.getByTestId('otp-input'), {
      target: { value: '123456' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'settings.data.deleteAccountVerifyButton',
      }),
    );

    await waitFor(() => {
      expect(authApi.signInWithOTP).toHaveBeenCalledWith('me@test.com', '123456');
      expect(onConfirmDelete).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
