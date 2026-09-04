import { supabase } from '@/lib/supabase';
import { rows, row, maybeRow, done } from '@/services/supabaseCrud';
import type {
  Budget,
  NotificationPreferences,
  NotificationSettings,
} from '@/types/Budget';
import type { CategoryBudget } from '@/types/CategoryBudget';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag, EmbeddedTag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';
import type { NoSpendDay } from '@/types/NoSpendDay';

// Embeds select only the columns the UI renders (see EmbeddedCategory /
// EmbeddedTag): a full categories(*)/tags(*) embed roughly doubles every
// transaction row, which inflates history fetches and the localStorage
// snapshot for no benefit.
const CATEGORY_EMBED = 'category:categories(id, name, color, icon, type, kind)';
// Every tag embed names its FK explicitly. The bare `tags` embed name turned
// ambiguous for expenses when expense_tags landed (two relationships →
// PGRST201, HTTP 300) and broke months-stale PWA bundles that still sent it;
// 20260731165831_restore_legacy_tags_embed.sql shims those legacy clients
// with a computed relationship. Naming the FK keeps today's bundles immune
// if a second relationship path to tags ever appears on these tables.
const EXPENSE_TAG_EMBED = 'tag:tags!expenses_tag_id_fkey(id, name, color)';
const TEMPLATE_TAG_EMBED =
  'tag:tags!expense_templates_tag_id_fkey(id, name, color)';
const EXTRA_TAGS_EMBED = 'extra_tags:expense_tags(tag:tags(id, name, color))';
const SELECT_WITH_CATEGORY_AND_TAG = `*, ${CATEGORY_EMBED}, ${EXPENSE_TAG_EMBED}, ${EXTRA_TAGS_EMBED}`;
const SELECT_WITH_CATEGORY = `*, ${CATEGORY_EMBED}`;
// Templates embed category+tag but NOT extra_tags — expense_tags references
// expenses, so that embed only resolves on the expenses table.
const SELECT_TEMPLATE = `*, ${CATEGORY_EMBED}, ${TEMPLATE_TAG_EMBED}`;

// Write payload for expenses: the row columns plus the Pro-only additional
// tag ids, which land in expense_tags rather than on the row itself. The
// offline queue replays these payloads verbatim, so extras survive offline.
export type ExpenseWritePayload = Partial<Expense> & {
  extra_tag_ids?: string[];
};

export const dataService = {
  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;

    return user;
  },

  async getCategories(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', ownerId)
      .order('name');
    if (signal) query = query.abortSignal(signal);

    return rows<Category>(query);
  },

  async getTags(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('tags')
      .select('*')
      .eq('user_id', ownerId)
      .order('name');
    if (signal) query = query.abortSignal(signal);

    return rows<Tag>(query);
  },

  async createTag(tagData: { name: string; color: string }, ownerId: string) {
    return row<Tag>(
      supabase
        .from('tags')
        .insert({ ...tagData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateTag(tagId: string, tagData: { name: string }) {
    return row<Tag>(
      supabase.from('tags').update(tagData).eq('id', tagId).select().single(),
    );
  },

  // expenses.tag_id is ON DELETE SET NULL and expense_tags cascades,
  // so deleting a tag never touches the expenses themselves.
  async deleteTag(tagId: string) {
    await done(supabase.from('tags').delete().eq('id', tagId));
  },

  async getNoSpendDays(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('no_spend_days')
      .select('*')
      .eq('user_id', ownerId)
      .order('day', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<NoSpendDay>(query);
  },

  // Idempotent by primary key — a double tap or a replayed write banks the day
  // once. onConflict/ignoreDuplicates keeps that from surfacing as an error the
  // caller would have to special-case.
  async createNoSpendDay(day: string, ownerId: string) {
    return maybeRow<NoSpendDay>(
      supabase
        .from('no_spend_days')
        .upsert(
          { day, user_id: ownerId },
          { onConflict: 'user_id,day', ignoreDuplicates: true },
        )
        .select()
        .maybeSingle(),
    );
  },

  async deleteNoSpendDay(day: string, ownerId: string) {
    await done(
      supabase
        .from('no_spend_days')
        .delete()
        .eq('user_id', ownerId)
        .eq('day', day),
    );
  },

  async getExpenses(
    ownerId: string,
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    const rows = await fetchAllPages<Expense>((from, to) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY_AND_TAG)
        .eq('user_id', ownerId)
        .eq('type', 'expense')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (sinceDate) query = query.gte('date', sinceDate);
      if (beforeDate) query = query.lt('date', beforeDate);
      if (signal) query = query.abortSignal(signal);

      return query;
    });

    return rows.map(flattenExtraTags);
  },

  async getIncomes(
    ownerId: string,
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    return fetchAllPages<Expense>((from, to) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
        .eq('user_id', ownerId)
        .eq('type', 'income')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (sinceDate) query = query.gte('date', sinceDate);
      if (beforeDate) query = query.lt('date', beforeDate);
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },

  async createIncomesBulk(
    incomesData: Array<{
      date: string;
      description: string;
      amount: number;
      category_id: string | null;
    }>,
    ownerId: string,
  ) {
    return rows<Expense>(
      supabase
        .from('expenses')
        .insert(
          incomesData.map((income) => ({
            ...income,
            user_id: ownerId,
            type: 'income',
            review_status: 'pending',
            review_reason: 'import',
            reviewed_at: null,
          })),
        )
        .select(SELECT_WITH_CATEGORY),
    );
  },

  async createIncome(incomeData: Partial<Expense>, ownerId: string) {
    return row<Expense>(
      supabase
        .from('expenses')
        .insert({ ...incomeData, user_id: ownerId, type: 'income' })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateIncome(incomeData: Partial<Expense>, incomeId: string) {
    const {
      user_id: _u,
      created_by: _creator,
      id: _i,
      created_at: _c,
      ...safeUpdate
    } = incomeData;

    return row<Expense>(
      supabase
        .from('expenses')
        .update(safeUpdate)
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteIncome(incomeId: string) {
    await done(supabase.from('expenses').delete().eq('id', incomeId));
  },

  async updateExpense(expenseData: ExpenseWritePayload, expenseId: string) {
    // Strip immutable fields — user_id, id, created_at must never be changed via update.
    // RLS WITH CHECK also enforces this server-side, but stripping client-side is defence-in-depth.
    // extra_tag_ids/extra_tags are not row columns; extras are synced below.
    const {
      user_id: _u,
      created_by: _creator,
      id: _i,
      created_at: _c,
      extra_tag_ids,
      extra_tags: _e,
      ...safeUpdate
    } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .update(safeUpdate)
      .eq('id', expenseId)
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .single();

    if (error) throw error;

    // undefined = caller didn't touch tags; [] = caller cleared the extras.
    if (extra_tag_ids === undefined) {
      return flattenExtraTags(data as Expense);
    }

    await this.setExpenseExtraTags(expenseId, extra_tag_ids, data.user_id);

    return this.getExpenseById(expenseId);
  },

  async createExpense(expenseData: ExpenseWritePayload, ownerId: string) {
    const { extra_tag_ids, extra_tags: _e, ...rowData } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...rowData, user_id: ownerId })
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .single();

    if (error) throw error;

    const created = data as Expense;
    if (!extra_tag_ids || extra_tag_ids.length === 0) {
      return flattenExtraTags(created);
    }

    await this.setExpenseExtraTags(created.id, extra_tag_ids, ownerId);

    return this.getExpenseById(created.id);
  },

  // Replaces the full extras set for one expense. Delete-then-insert keeps
  // the logic obvious; the sets involved are tiny.
  async setExpenseExtraTags(
    expenseId: string,
    tagIds: string[],
    ownerId: string,
  ) {
    const { error: deleteError } = await supabase
      .from('expense_tags')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteError) throw deleteError;
    if (tagIds.length === 0) return;

    const { error: insertError } = await supabase.from('expense_tags').insert(
      tagIds.map((tagId) => ({
        expense_id: expenseId,
        tag_id: tagId,
        user_id: ownerId,
      })),
    );

    if (insertError) throw insertError;
  },

  async getExpenseById(expenseId: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .eq('id', expenseId)
      .single();

    if (error) throw error;

    return flattenExtraTags(data as Expense);
  },

  async createExpensesBulk(
    expensesData: Array<{
      date: string;
      description: string;
      amount: number;
      category_id: string | null;
      // Carried by splits so the parts inherit what the original was: its
      // primary tag, its note, and whether it counted towards totals.
      tag_id?: string | null;
      note?: string | null;
      is_excluded?: boolean;
    }>,
    ownerId: string,
    reviewReason?: 'import' | 'connection',
  ) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(
        expensesData.map((expense) =>
          buildBulkExpense(expense, ownerId, reviewReason),
        ),
      )
      .select(SELECT_WITH_CATEGORY_AND_TAG);

    if (error) throw error;

    return (data as Expense[]).map(flattenExtraTags);
  },

  async deleteExpense(expenseId: string) {
    await done(supabase.from('expenses').delete().eq('id', expenseId));
  },

  async createCategory(categoryData: Partial<Category>, ownerId: string) {
    return row<Category>(
      supabase
        .from('categories')
        .insert({ ...categoryData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateCategory(categoryId: string, categoryData: Partial<Category>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = categoryData;

    return row<Category>(
      supabase
        .from('categories')
        .update(safeUpdate)
        .eq('id', categoryId)
        .select()
        .single(),
    );
  },

  async deleteCategory(categoryId: string) {
    await done(supabase.from('categories').delete().eq('id', categoryId));
  },

  // Atomic reassign-then-delete via Postgres function: every expense on
  // fromCategoryId moves to toCategoryId, then fromCategoryId is removed.
  // Returns the number of expenses moved.
  async mergeCategory(fromCategoryId: string, toCategoryId: string) {
    return row<number>(
      supabase.rpc('merge_category', {
        p_from_category_id: fromCategoryId,
        p_to_category_id: toCategoryId,
      }),
    );
  },

  async getRecurringExpenses(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('user_id', ownerId)
      .eq('type', 'expense')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<RecurringExpense>(query);
  },

  async getRecurringIncomes(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('user_id', ownerId)
      .eq('type', 'income')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<RecurringExpense>(query);
  },

  async createRecurringIncome(
    incomeData: Partial<RecurringExpense>,
    ownerId: string,
  ) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .insert({ ...incomeData, user_id: ownerId, type: 'income' })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateRecurringIncome(
    incomeData: Partial<RecurringExpense>,
    incomeId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = incomeData;

    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update(safeUpdate)
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteRecurringIncome(incomeId: string) {
    await done(supabase.from('recurring_expenses').delete().eq('id', incomeId));
  },

  async toggleRecurringIncome(incomeId: string, active: boolean) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update({ active })
        .eq('id', incomeId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async createRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    ownerId: string,
  ) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .insert({ ...expenseData, user_id: ownerId })
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async updateRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    expenseId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = expenseData;

    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update(safeUpdate)
        .eq('id', expenseId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async deleteRecurringExpense(expenseId: string) {
    await done(
      supabase.from('recurring_expenses').delete().eq('id', expenseId),
    );
  },

  async toggleRecurringExpense(expenseId: string, active: boolean) {
    return row<RecurringExpense>(
      supabase
        .from('recurring_expenses')
        .update({ active })
        .eq('id', expenseId)
        .select(SELECT_WITH_CATEGORY)
        .single(),
    );
  },

  async getBudget(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('user_budgets')
      .select(
        'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
      )
      .eq('user_id', ownerId);
    if (signal) query = query.abortSignal(signal);

    return maybeRow<Budget>(query.maybeSingle());
  },

  async upsertBudget(monthlyAmount: number, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, monthly_amount: monthlyAmount },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async updateDefaultCurrency(currency: string, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, default_currency: currency },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async updateDefaultSavingsPct(pct: number | null, ownerId: string) {
    return row<Budget>(
      supabase
        .from('user_budgets')
        .upsert(
          { user_id: ownerId, default_savings_pct: pct },
          { onConflict: 'user_id' },
        )
        .select(
          'id, user_id, monthly_amount, default_savings_pct, default_currency, created_at, updated_at',
        )
        .maybeSingle(),
    );
  },

  async getCategoryBudgets(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('category_budgets')
      .select('*')
      .eq('user_id', ownerId);
    if (signal) query = query.abortSignal(signal);

    return rows<CategoryBudget>(query);
  },

  async upsertCategoryBudget(
    categoryId: string,
    monthlyAmount: number,
    ownerId: string,
  ) {
    return row<CategoryBudget>(
      supabase
        .from('category_budgets')
        .upsert(
          {
            user_id: ownerId,
            category_id: categoryId,
            monthly_amount: monthlyAmount,
          },
          { onConflict: 'user_id,category_id' },
        )
        .select()
        .single(),
    );
  },

  async deleteCategoryBudget(categoryId: string, ownerId: string) {
    await done(
      supabase
        .from('category_budgets')
        .delete()
        .eq('user_id', ownerId)
        .eq('category_id', categoryId),
    );
  },

  async updateDailyReminderHour(hour: number | null) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return row<NotificationSettings>(
      supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: session.user.id, daily_reminder_hour: hour },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle(),
    );
  },

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return row<NotificationSettings>(
      supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: session.user.id, notification_preferences: prefs },
          { onConflict: 'user_id' },
        )
        .select()
        .maybeSingle(),
    );
  },

  async getNotificationSettings(signal?: AbortSignal) {
    let query = supabase.from('user_notification_settings').select('*');
    if (signal) query = query.abortSignal(signal);

    return maybeRow<NotificationSettings>(query.maybeSingle());
  },

  async getTemplates(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('expense_templates')
      .select(SELECT_TEMPLATE)
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<ExpenseTemplate>(query);
  },

  async createTemplate(
    templateData: Partial<ExpenseTemplate>,
    ownerId: string,
  ) {
    return row<ExpenseTemplate>(
      supabase
        .from('expense_templates')
        .insert({ ...templateData, user_id: ownerId })
        .select(SELECT_TEMPLATE)
        .single(),
    );
  },

  async deleteTemplate(templateId: string) {
    await done(
      supabase.from('expense_templates').delete().eq('id', templateId),
    );
  },

  async getGoals(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);

    return rows<Goal>(query);
  },

  async createGoal(goalData: Partial<Goal>, ownerId: string) {
    return row<Goal>(
      supabase
        .from('goals')
        .insert({ ...goalData, user_id: ownerId })
        .select()
        .single(),
    );
  },

  async updateGoal(goalId: string, goalData: Partial<Goal>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = goalData;

    return row<Goal>(
      supabase
        .from('goals')
        .update(safeUpdate)
        .eq('id', goalId)
        .select()
        .single(),
    );
  },

  async deleteGoal(goalId: string) {
    await done(supabase.from('goals').delete().eq('id', goalId));
  },

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
    return fetchAllPages<AccountBalance>((from, to) => {
      let query = supabase
        .from('account_balances')
        .select('*')
        .eq('account_id', accountId)
        .order('recorded_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },

  async getAllAccountBalances(ownerId: string, signal?: AbortSignal) {
    return fetchAllPages<AccountBalance>((from, to) => {
      let query = supabase
        .from('account_balances')
        .select('*')
        .eq('user_id', ownerId)
        .order('recorded_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
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

  // Interest accrues every day, but recompute_debt_balance only ran when a
  // payment row moved — so a debt untouched for months carried a balance
  // months out of date, and that figure feeds net worth and the payoff
  // planner. Bringing the balances current immediately before reading them
  // means the number is fresh exactly when someone is looking at it.
  // Best-effort: a failure here must not stop the debts from loading.
  async refreshDebtBalances(ownerId: string) {
    await done(supabase.rpc('refresh_debt_balances', { p_owner_id: ownerId }));
  },

  async getDebts(ownerId: string, signal?: AbortSignal) {
    let query = supabase
      .from('debts')
      .select('*')
      .eq('user_id', ownerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);

    return rows<Debt>(query);
  },

  async getDebtById(debtId: string, signal?: AbortSignal) {
    let query = supabase.from('debts').select('*').eq('id', debtId);
    if (signal) query = query.abortSignal(signal);

    return row<Debt>(query.single());
  },

  async createDebt(debtData: Partial<Debt>, ownerId: string) {
    // Most users only know what they currently owe, not the original loan
    // amount. We treat the entered current_balance as both original_principal
    // and current_balance — the recompute trigger will keep current_balance
    // correct from there as payments are logged.
    return row<Debt>(
      supabase
        .from('debts')
        .insert({
          ...debtData,
          user_id: ownerId,
          original_principal: debtData.current_balance,
        })
        .select()
        .single(),
    );
  },

  async updateDebt(debtId: string, debtData: Partial<Debt>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = debtData;

    return row<Debt>(
      supabase
        .from('debts')
        .update(safeUpdate)
        .eq('id', debtId)
        .select()
        .single(),
    );
  },

  async archiveDebt(debtId: string) {
    return row<Debt>(
      supabase
        .from('debts')
        .update({ is_archived: true })
        .eq('id', debtId)
        .select()
        .single(),
    );
  },

  async getDebtPayments(debtId: string, signal?: AbortSignal) {
    return fetchAllPages<Expense>((from, to) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
        .eq('debt_id', debtId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (signal) query = query.abortSignal(signal);

      return query;
    });
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

// --- Helpers ---

// PostgREST silently caps every request at 1000 rows, so any fetch that can
// grow past that (transaction history, balance snapshots, debt payments) must
// page until a short page arrives — otherwise older rows just vanish.
const SUPABASE_PAGE_SIZE = 1000;

// PostgREST returns the expense_tags embed as [{ tag: {...} }]; the app wants
// a plain EmbeddedTag[]. Rows from sources without the embed (incomes, cached
// snapshots) pass through with an empty array.
type RawExtraTag = { tag: EmbeddedTag | null };

const flattenExtraTags = (row: Expense): Expense => {
  const raw = (row.extra_tags ?? []) as unknown as RawExtraTag[];

  return {
    ...row,
    extra_tags: raw
      .map((entry) => entry.tag)
      .filter((tag): tag is EmbeddedTag => tag !== null && tag !== undefined),
  };
};

const buildBulkExpense = <T extends Record<string, unknown>>(
  expense: T,
  ownerId: string,
  reviewReason: 'import' | 'connection' | undefined,
): T & Record<string, unknown> => {
  if (!reviewReason) {
    return { ...expense, user_id: ownerId };
  }

  return {
    ...expense,
    user_id: ownerId,
    review_status: 'pending',
    review_reason: reviewReason,
    reviewed_at: null,
  };
};

type PageResult = {
  data: unknown;
  error: { message: string } | null;
};

const fetchAllPages = async <T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[]> => {
  const rows: T[] = [];
  let from = 0;

  // Offset pagination over a fully-ordered query (stable id tiebreaker).
  // A concurrent insert can shift a page boundary; callers merge by id, and
  // the next refresh self-heals, so keyset pagination isn't worth the extra
  // complexity here.
  for (;;) {
    const { data, error } = await buildPage(
      from,
      from + SUPABASE_PAGE_SIZE - 1,
    );
    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
};
