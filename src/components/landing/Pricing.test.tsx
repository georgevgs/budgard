import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import Pricing from './Pricing';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/landing/SectionShell', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

describe('Pricing', () => {
  it('defaults to yearly cycle and shows the per-month yearly price', () => {
    render(<Pricing onGetStarted={vi.fn()} />);

    expect(screen.getByText('€1.66')).toBeInTheDocument();
    expect(screen.getByText('landing.pricing.billedYearly')).toBeInTheDocument();
  });

  it('switches to monthly pricing when monthly toggle clicked', () => {
    render(<Pricing onGetStarted={vi.fn()} />);

    fireEvent.click(screen.getByText('landing.pricing.monthly'));

    expect(screen.getByText('€1.99')).toBeInTheDocument();
    expect(screen.queryByText('€1.66')).not.toBeInTheDocument();
  });

  it('switches back to yearly', () => {
    render(<Pricing onGetStarted={vi.fn()} />);

    fireEvent.click(screen.getByText('landing.pricing.monthly'));
    fireEvent.click(screen.getByText('landing.pricing.yearly'));

    expect(screen.getByText('€1.66')).toBeInTheDocument();
  });

  it('only shows the save badge on the yearly option', () => {
    render(<Pricing onGetStarted={vi.fn()} />);

    expect(screen.getAllByText('landing.pricing.save')).toHaveLength(1);
  });

  it('renders both plan CTAs and forwards onGetStarted', () => {
    const onGetStarted = vi.fn();
    render(<Pricing onGetStarted={onGetStarted} />);

    fireEvent.click(screen.getByText('landing.pricing.free.cta'));
    fireEvent.click(screen.getByText('landing.pricing.pro.cta'));

    expect(onGetStarted).toHaveBeenCalledTimes(2);
  });

  it('lists 5 free features and 6 pro features', () => {
    render(<Pricing onGetStarted={vi.fn()} />);

    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByText(`landing.pricing.free.feature${i}`),
      ).toBeInTheDocument();
    }
    for (let i = 1; i <= 6; i++) {
      expect(
        screen.getByText(`landing.pricing.pro.feature${i}`),
      ).toBeInTheDocument();
    }
  });
});
