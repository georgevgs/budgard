import { describe, it, expect, vi, beforeEach } from 'vitest';

const reconcile = vi.hoisted(() => vi.fn());
vi.mock('@/common/api/recurringSuggestionService', () => ({
  recurringSuggestionService: { reconcile },
}));
const captureException = vi.hoisted(() => vi.fn());
vi.mock('@/config/sentry', () => ({ captureException }));

import { reconcileImportedRows } from '@/common/hooks/dataOps/helpers';

describe('reconcileImportedRows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes when rows were linked to a schedule', async () => {
    reconcile.mockResolvedValue(2);
    const refresh = vi.fn().mockResolvedValue(undefined);

    await reconcileImportedRows('owner', refresh);

    expect(refresh).toHaveBeenCalled();
  });

  // It runs after the rows are saved. Letting its failure through reported a
  // saved import as failed, and the user's retry inserted every row again.
  it('does not fail an import whose rows are already saved', async () => {
    reconcile.mockRejectedValue(new Error('rpc down'));
    const refresh = vi.fn();

    await expect(reconcileImportedRows('owner', refresh)).resolves.toBe(
      undefined,
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
  });
});
