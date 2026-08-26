import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import FeedbackSection from '@/components/settings/FeedbackSection';

const mockSubmitFeedback = vi.fn();

vi.mock('@/hooks/dataOps/useFeedbackOps', () => ({
  useFeedbackOps: () => ({ submitFeedback: mockSubmitFeedback }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe('FeedbackSection', () => {
  it('submits a problem report with the current route', async () => {
    mockSubmitFeedback.mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <FeedbackSection />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'settings.feedback.reportProblem' }),
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'settings.feedback.messageLabel' }),
      { target: { value: 'The save button stopped responding.' } },
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'settings.feedback.submit' }),
      ).toBeEnabled();
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'settings.feedback.submit' }),
    );

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        kind: 'bug',
        message: 'The save button stopped responding.',
        route: '/settings',
      });
    });
  });
});
