import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeedbackOps } from '@/common/hooks/dataOps/useFeedbackOps';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/common/api/feedbackService', () => ({
  feedbackService: { create: mocks.create },
}));

vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const REPORT = {
  kind: 'bug' as const,
  message: 'Something looks off',
  route: '/today',
};

describe('useFeedbackOps', () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.toast.mockReset();
  });

  it('says when to try again once the per-account ceiling is reached', async () => {
    mocks.create.mockRejectedValue({
      code: '23514',
      message: 'Feedback limit reached',
    });
    const { result } = renderHook(() => useFeedbackOps());

    await act(async () => {
      await expect(result.current.submitFeedback(REPORT)).rejects.toBeTruthy();
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'settings.feedback.limited' }),
    );
  });

  it('keeps the generic retry message for any other failure', async () => {
    mocks.create.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useFeedbackOps());

    await act(async () => {
      await expect(result.current.submitFeedback(REPORT)).rejects.toBeTruthy();
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'settings.feedback.failed' }),
    );
  });
});
