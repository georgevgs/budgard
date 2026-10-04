import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FeedbackSection } from '@/pages/settings/components/FeedbackSection';

const mockSubmitFeedback = vi.fn();

vi.mock('@/common/hooks/dataOps/useFeedbackOps', () => ({
  useFeedbackOps: () => ({ submitFeedback: mockSubmitFeedback }),
}));

describe('FeedbackSection', () => {
  it('keeps a draft until discarding is confirmed', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <FeedbackSection />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'settings.feedback.reportProblem' }),
    );
    const message = screen.getByRole('textbox', {
      name: 'settings.feedback.messageLabel',
    });
    fireEvent.change(message, { target: { value: 'Please keep this draft.' } });
    fireEvent.blur(message);
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(message).toHaveValue('Please keep this draft.');

    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'common.discardConfirm' }),
    );
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });

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
    fireEvent.blur(
      screen.getByRole('textbox', { name: 'settings.feedback.messageLabel' }),
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
