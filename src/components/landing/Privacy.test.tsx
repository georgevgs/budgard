import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import Privacy from './Privacy';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/landing/SectionShell', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

describe('Privacy', () => {
  it('renders heading, body and eyebrow', () => {
    render(<Privacy />);

    expect(screen.getByText('landing.privacy.eyebrow')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'landing.privacy.heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('landing.privacy.body')).toBeInTheDocument();
  });

  it('renders three pillars', () => {
    render(<Privacy />);

    expect(screen.getByText('landing.privacy.pillar1.title')).toBeInTheDocument();
    expect(screen.getByText('landing.privacy.pillar2.title')).toBeInTheDocument();
    expect(screen.getByText('landing.privacy.pillar3.title')).toBeInTheDocument();
  });

  it('renders a body paragraph for each pillar', () => {
    render(<Privacy />);

    expect(screen.getByText('landing.privacy.pillar1.body')).toBeInTheDocument();
    expect(screen.getByText('landing.privacy.pillar2.body')).toBeInTheDocument();
    expect(screen.getByText('landing.privacy.pillar3.body')).toBeInTheDocument();
  });
});
