import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let capturedOnSuccess: (() => void) | null = null;

vi.mock('@/components/auth/OtpForm', () => ({
  default: ({ onSuccess }: { onSuccess: () => void }) => {
    capturedOnSuccess = onSuccess;
    return <div data-testid="otp-form" />;
  },
}));

import LoginModal from './LoginModal';

describe('LoginModal', () => {
  it('does not render content when closed', () => {
    render(<LoginModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('auth.signIn')).not.toBeInTheDocument();
  });

  it('renders title, description, and OtpForm when open', () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('auth.signIn')).toBeInTheDocument();
    expect(screen.getByText('auth.emailVerification')).toBeInTheDocument();
    expect(screen.getByTestId('otp-form')).toBeInTheDocument();
  });

  it('closes the dialog when OtpForm reports success', () => {
    const onOpenChange = vi.fn();
    render(<LoginModal open={true} onOpenChange={onOpenChange} />);

    capturedOnSuccess?.();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
