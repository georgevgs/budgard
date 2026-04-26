import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import FinalCta from './FinalCta';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('FinalCta', () => {
  it('renders heading, body and CTA from i18n keys', () => {
    render(<FinalCta onGetStarted={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'landing.finalCta.heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('landing.finalCta.body')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /landing\.finalCta\.cta/ }),
    ).toBeInTheDocument();
  });

  it('forwards CTA clicks', () => {
    const onGetStarted = vi.fn();
    render(<FinalCta onGetStarted={onGetStarted} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onGetStarted).toHaveBeenCalledOnce();
  });
});
