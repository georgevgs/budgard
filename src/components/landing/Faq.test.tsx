import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Faq from '@/components/landing/Faq';

vi.mock('@/components/landing/Reveal', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

describe('Faq', () => {
  it('connects each question to an announced answer region', () => {
    render(<Faq />);

    const firstQuestion = screen.getByRole('button', {
      name: 'landing.faq.q1.question',
    });
    const firstAnswer = screen.getByRole('region', {
      name: 'landing.faq.q1.question',
    });

    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(firstQuestion).toHaveAttribute('aria-controls', firstAnswer.id);

    fireEvent.click(firstQuestion);

    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('landing.faq.q1.answer')).not.toBeInTheDocument();
  });
});
