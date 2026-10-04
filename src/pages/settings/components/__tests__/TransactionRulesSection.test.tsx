import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionRulesSection } from '@/pages/settings/components/TransactionRulesSection';
import type { TransactionRule } from '@/types/TransactionRule';

const service = vi.hoisted(() => ({ getRules: vi.fn(), deleteRule: vi.fn() }));
const space = vi.hoisted(() => ({ activeOwnerId: 'owner-1' }));
const showError = vi.hoisted(() => vi.fn());

vi.mock('@/common/api/transactionRuleService', () => ({
  transactionRuleService: service,
}));
vi.mock('@/common/contexts/FinancialSpaceContext', () => ({
  useFinancialSpace: () => space,
}));
vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => ({ isInitialized: true }),
}));
vi.mock('@/common/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/common/hooks/dataOps/useShowErrorToast', () => ({
  useShowErrorToast: () => showError,
}));
vi.mock('@/constants/haptics', () => ({
  haptics: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('@/config/sentry', () => ({ captureException: vi.fn() }));

const rule: TransactionRule = {
  id: 'rule-1',
  user_id: 'owner-1',
  match_type: 'contains',
  match_value: 'coffee',
  transaction_type: 'expense',
  rename_to: 'Coffee shop',
  category_id: null,
  tag_id: null,
  priority: 0,
  is_active: true,
  created_at: '2026-10-01',
  updated_at: '2026-10-01',
};

const view = () => (
  <MemoryRouter>
    <TransactionRulesSection />
  </MemoryRouter>
);
const openDeletion = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'settings.rules.deleteLabel' }),
  );
const confirmDeletion = () =>
  fireEvent.click(screen.getByRole('button', { name: 'common.delete' }));

beforeEach(() => {
  vi.resetAllMocks();
  space.activeOwnerId = 'owner-1';
  service.getRules.mockResolvedValue([rule]);
  service.deleteRule.mockResolvedValue(undefined);
});

describe('TransactionRulesSection', () => {
  it('lists rules in the selected space and requires confirmation before deletion', async () => {
    render(view());
    await screen.findByText('coffee');
    expect(service.getRules).toHaveBeenCalledWith(
      'owner-1',
      expect.any(AbortSignal),
    );
    openDeletion();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(service.deleteRule).not.toHaveBeenCalled();
    expect(screen.getByText('coffee')).toBeInTheDocument();
    openDeletion();
    confirmDeletion();
    await waitFor(() =>
      expect(service.deleteRule).toHaveBeenCalledWith('rule-1', 'owner-1'),
    );
    await waitFor(() => expect(screen.queryByText('coffee')).toBeNull());
    expect(await screen.findByText('settings.rules.empty')).toBeInTheDocument();
  });

  it('removes immediately and restores a rule when deletion fails, with a retry', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    service.deleteRule.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectWrite = reject;
        }),
    );
    render(view());
    await screen.findByText('coffee');
    openDeletion();
    confirmDeletion();
    await waitFor(() => expect(screen.queryByText('coffee')).toBeNull());
    await act(async () => rejectWrite(new Error('offline')));
    expect(await screen.findByText('coffee')).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith(
      'settings.rules.deleteFailed',
      expect.any(Function),
    );
  });

  it('offers a retry after loading fails instead of claiming there are no rules', async () => {
    service.getRules
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([]);
    render(view());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'settings.rules.loadFailed',
    );
    expect(screen.queryByText('settings.rules.empty')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common.tryAgain' }));
    expect(await screen.findByText('settings.rules.empty')).toBeInTheDocument();
    expect(service.getRules).toHaveBeenCalledTimes(2);
  });

  it('ignores a late load from the previous financial space', async () => {
    let resolveOld: (rules: TransactionRule[]) => void = () => undefined;
    service.getRules.mockImplementationOnce(
      () =>
        new Promise<TransactionRule[]>((resolve) => {
          resolveOld = resolve;
        }),
    );
    const { rerender } = render(view());
    space.activeOwnerId = 'owner-2';
    service.getRules.mockResolvedValue([
      { ...rule, id: 'rule-2', user_id: 'owner-2', match_value: 'new owner' },
    ]);
    rerender(view());
    await screen.findByText('new owner');
    await act(async () => resolveOld([rule]));
    expect(screen.queryByText('coffee')).toBeNull();
    expect(screen.getByText('new owner')).toBeInTheDocument();
  });

  it('keeps a failed deletion rollback out of the next financial space', async () => {
    let rejectWrite: (error: Error) => void = () => undefined;
    service.deleteRule.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectWrite = reject;
        }),
    );
    const { rerender } = render(view());
    await screen.findByText('coffee');
    openDeletion();
    confirmDeletion();
    await waitFor(() => expect(screen.queryByText('coffee')).toBeNull());
    space.activeOwnerId = 'owner-2';
    service.getRules.mockResolvedValue([
      { ...rule, id: 'rule-2', user_id: 'owner-2', match_value: 'new owner' },
    ]);
    rerender(view());
    await screen.findByText('new owner');
    await act(async () => rejectWrite(new Error('offline')));
    expect(screen.queryByText('coffee')).toBeNull();
    expect(screen.getByText('new owner')).toBeInTheDocument();
    expect(service.deleteRule).toHaveBeenCalledWith('rule-1', 'owner-1');
  });
});
