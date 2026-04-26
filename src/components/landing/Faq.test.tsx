import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import Faq from './Faq';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/landing/SectionShell', () => ({
  default: ({ children }: { children: ReactNode }) => <section>{children}</section>,
}));

describe('Faq', () => {
  it('renders all six question buttons', () => {
    render(<Faq />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it('opens the first item by default', () => {
    render(<Faq />);
    expect(screen.getByText('landing.faq.q1.answer')).toBeInTheDocument();
  });

  it('toggles the open item when its button is clicked', () => {
    render(<Faq />);

    fireEvent.click(screen.getByText('landing.faq.q1.question'));
    expect(screen.queryByText('landing.faq.q1.answer')).not.toBeInTheDocument();
  });

  it('closes the previous item when a new one is opened', () => {
    render(<Faq />);

    fireEvent.click(screen.getByText('landing.faq.q3.question'));

    expect(screen.queryByText('landing.faq.q1.answer')).not.toBeInTheDocument();
    expect(screen.getByText('landing.faq.q3.answer')).toBeInTheDocument();
  });
});
