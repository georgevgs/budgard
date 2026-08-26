import { describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { feedbackService } from '@/services/feedbackService';

const mockInsert = (error: unknown = null) => {
  const chain = {
    insert: vi.fn(() => ({ error })),
  };
  vi.mocked(supabase.from).mockReturnValue(chain as never);

  return chain;
};

describe('feedbackService', () => {
  it('submits only the report and minimal diagnostic context', async () => {
    const chain = mockInsert();

    await feedbackService.create({
      kind: 'bug',
      message: 'The category picker closed unexpectedly.',
      route: '/activity',
      appVersion: '2.1.7',
    });

    expect(supabase.from).toHaveBeenCalledWith('feedback_reports');
    expect(chain.insert).toHaveBeenCalledWith({
      kind: 'bug',
      message: 'The category picker closed unexpectedly.',
      route: '/activity',
      app_version: '2.1.7',
    });
  });

  it('surfaces insert errors', async () => {
    const error = { message: 'denied' };
    mockInsert(error);

    await expect(
      feedbackService.create({
        kind: 'feedback',
        message: 'A useful message here.',
        route: '/settings',
        appVersion: '2.1.7',
      }),
    ).rejects.toEqual(error);
  });
});
