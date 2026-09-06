import { supabase } from '@/config/supabase';
import { done, row, rows } from '@/config/supabaseCrud';
import { SUPABASE_PAGE_SIZE, accountBalanceCursorFilter, fetchAllPages } from '@/common/api/dataAccess';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

// Supabase queries for networth, at the feature root so an audit of what
// this feature reads and writes is one file.
export const networthApi = {

  async getAccounts(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('accounts')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);

    return rows<Account>(query);
  },

  async createAccount(
    accountData: Partial<Account> & { initial_balance?: number },
    ownerId: string,
  ) {
    const { initial_balance, ...accountFields } = accountData;
    const { data: created, error } = await supabase
      .from('accounts')
      .insert({ ...accountFields, user_id: ownerId })
      .select()
      .single();

    if (error) throw error;

    // Seed an initial snapshot so the trigger keeps current_balance accurate
    // and the time-series chart has a starting point.
    if (initial_balance !== undefined && initial_balance !== null) {
      let contributionDelta: number | null = null;
      if ((created as Account).kind === 'investment') {
        contributionDelta = initial_balance;
      }

      const { error: snapshotError } = await supabase
        .from('account_balances')
        .insert({
          account_id: (created as Account).id,
          user_id: ownerId,
          balance: initial_balance,
          contribution_delta: contributionDelta,
        });
      if (snapshotError) throw snapshotError;
    }

    // Re-read so we get the trigger-updated current_balance / cost_basis.
    const { data: refreshed, error: refreshError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', (created as Account).id)
      .single();
    if (refreshError) throw refreshError;

    return refreshed as Account;
  },

  async updateAccount(accountId: string, accountData: Partial<Account>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = accountData;

    return row<Account>(
      supabase
        .from('accounts')
        .update(safeUpdate)
        .eq('id', accountId)
        .select()
        .single(),
    );
  },

  async archiveAccount(accountId: string) {
    return row<Account>(
      supabase
        .from('accounts')
        .update({ is_archived: true })
        .eq('id', accountId)
        .select()
        .single(),
    );
  },

  async getAccountBalances(accountId: string, signal?: AbortSignal) {
    return fetchAllPages<AccountBalance>((cursor) => {
      let query = supabase
        .from('account_balances')
        .select('*')
        .eq('account_id', accountId)
        .order('recorded_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(SUPABASE_PAGE_SIZE);
      if (cursor) {
        query = query.or(accountBalanceCursorFilter(cursor, 'descending'));
      }
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },

  async getAllAccountBalances(ownerId: string, signal?: AbortSignal) {
    return fetchAllPages<AccountBalance>((cursor) => {
      let query = supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', ownerId)
        .order('recorded_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(SUPABASE_PAGE_SIZE);
      if (cursor) {
        query = query.or(accountBalanceCursorFilter(cursor, 'ascending'));
      }
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },

  async createAccountBalance(
    snapshot: Partial<AccountBalance>,
    ownerId: string,
  ) {
    return row<AccountBalance>(
      supabase
        .from('account_balances')
        .insert({ ...snapshot, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async upsertAccountBalance(snapshot: Partial<AccountBalance>) {
    // Atomic upsert via Postgres function — preserves a same-day
    // contribution_delta when the caller didn't supply one. Replaces an
    // earlier client-side SELECT-then-UPSERT that had a TOCTOU race when
    // two devices logged into the same account wrote on the same day.
    if (!snapshot.account_id || snapshot.balance == null) {
      throw new Error('account_id and balance are required');
    }

    return row<AccountBalance>(
      supabase.rpc('upsert_account_balance', {
        p_account_id: snapshot.account_id,
        p_balance: snapshot.balance,
        p_contribution_delta: snapshot.contribution_delta ?? null,
        p_recorded_at: snapshot.recorded_at ?? null,
        p_note: snapshot.note ?? null,
        p_original_amount: snapshot.original_amount ?? null,
        p_original_currency: snapshot.original_currency ?? null,
        p_exchange_rate: snapshot.exchange_rate ?? null,
      }),
    );
  },

  async deleteAccountBalance(snapshotId: string) {
    await done(supabase.from('account_balances').delete().eq('id', snapshotId));
  },

  async getAccountById(accountId: string, signal?: AbortSignal) {
    let query = supabase.from('accounts').select('*').eq('id', accountId);
    if (signal) query = query.abortSignal(signal);

    return row<Account>(query.single());
  },

  async deleteAccount() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(errorData?.error || 'Failed to delete account');
    }

    return response.json() as Promise<{ success: boolean }>;
  },
};
