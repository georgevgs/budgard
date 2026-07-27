import { supabase } from '@/lib/supabase';
import type { Budget, NotificationPreferences } from '@/types/Budget';
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

// Embeds select only the columns the UI renders (see EmbeddedCategory /
// EmbeddedTag): a full categories(*)/tags(*) embed roughly doubles every
// transaction row, which inflates history fetches and the localStorage
// snapshot for no benefit.
const CATEGORY_EMBED = 'category:categories(id, name, color, icon, type, kind)';
const TAG_EMBED = 'tag:tags(id, name, color)';
// Since expense_tags landed, expenses has two relationships to tags (the
// direct tag_id FK and the many-to-many through the junction table), so the
// primary-tag embed must name its FK or PostgREST rejects it as ambiguous
// (PGRST201).
const EXPENSE_TAG_EMBED = 'tag:tags!expenses_tag_id_fkey(id, name, color)';
const EXTRA_TAGS_EMBED = 'extra_tags:expense_tags(tag:tags(id, name, color))';
const SELECT_WITH_CATEGORY_AND_TAG = `*, ${CATEGORY_EMBED}, ${EXPENSE_TAG_EMBED}, ${EXTRA_TAGS_EMBED}`;
const SELECT_WITH_CATEGORY = `*, ${CATEGORY_EMBED}`;
// Templates embed category+tag but NOT extra_tags — expense_tags references
// expenses, so that embed only resolves on the expenses table.
const SELECT_TEMPLATE = `*, ${CATEGORY_EMBED}, ${TAG_EMBED}`;

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

  async getCategories(signal?: AbortSignal) {
    let query = supabase.from('categories').select('*').order('name');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Category[];
  },

  async getTags(signal?: AbortSignal) {
    let query = supabase.from('tags').select('*').order('name');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Tag[];
  },

  async createTag(tagData: { name: string; color: string }) {
    const { data, error } = await supabase
      .from('tags')
      .insert(tagData)
      .select()
      .single();

    if (error) throw error;

    return data as Tag;
  },

  async getExpenses(
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    const rows = await fetchAllPages<Expense>((from, to) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY_AND_TAG)
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
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    return fetchAllPages<Expense>((from, to) => {
      let query = supabase
        .from('expenses')
        .select(SELECT_WITH_CATEGORY)
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

  async createIncome(incomeData: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...incomeData, type: 'income' })
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as Expense;
  },

  async updateIncome(incomeData: Partial<Expense>, incomeId: string) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = incomeData;
    const { data, error } = await supabase
      .from('expenses')
      .update(safeUpdate)
      .eq('id', incomeId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as Expense;
  },

  async deleteIncome(incomeId: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', incomeId);

    if (error) throw error;
  },

  async updateExpense(expenseData: ExpenseWritePayload, expenseId: string) {
    // Strip immutable fields — user_id, id, created_at must never be changed via update.
    // RLS WITH CHECK also enforces this server-side, but stripping client-side is defence-in-depth.
    // extra_tag_ids/extra_tags are not row columns; extras are synced below.
    const {
      user_id: _u,
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

    await this.setExpenseExtraTags(expenseId, extra_tag_ids);

    return this.getExpenseById(expenseId);
  },

  async createExpense(expenseData: ExpenseWritePayload) {
    const { extra_tag_ids, extra_tags: _e, ...rowData } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .insert(rowData)
      .select(SELECT_WITH_CATEGORY_AND_TAG)
      .single();

    if (error) throw error;

    const created = data as Expense;
    if (!extra_tag_ids || extra_tag_ids.length === 0) {
      return flattenExtraTags(created);
    }

    await this.setExpenseExtraTags(created.id, extra_tag_ids);

    return this.getExpenseById(created.id);
  },

  // Replaces the full extras set for one expense. Delete-then-insert keeps
  // the logic obvious; the sets involved are tiny.
  async setExpenseExtraTags(expenseId: string, tagIds: string[]) {
    const { error: deleteError } = await supabase
      .from('expense_tags')
      .delete()
      .eq('expense_id', expenseId);

    if (deleteError) throw deleteError;
    if (tagIds.length === 0) return;

    const { error: insertError } = await supabase
      .from('expense_tags')
      .insert(tagIds.map((tagId) => ({ expense_id: expenseId, tag_id: tagId })));

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
    }>,
  ) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expensesData)
      .select(SELECT_WITH_CATEGORY_AND_TAG);

    if (error) throw error;

    return (data as Expense[]).map(flattenExtraTags);
  },

  async deleteExpense(expenseId: string) {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async createCategory(categoryData: Partial<Category>) {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single();

    if (error) throw error;

    return data as Category;
  },

  async updateCategory(categoryId: string, categoryData: Partial<Category>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = categoryData;
    const { data, error } = await supabase
      .from('categories')
      .update(safeUpdate)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    return data as Category;
  },

  async deleteCategory(categoryId: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
  },

  async getRecurringExpenses(signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('type', 'expense')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as RecurringExpense[];
  },

  async getRecurringIncomes(signal?: AbortSignal) {
    let query = supabase
      .from('recurring_expenses')
      .select(SELECT_WITH_CATEGORY)
      .eq('type', 'income')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as RecurringExpense[];
  },

  async createRecurringIncome(incomeData: Partial<RecurringExpense>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({ ...incomeData, type: 'income' })
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async updateRecurringIncome(
    incomeData: Partial<RecurringExpense>,
    incomeId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = incomeData;
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(safeUpdate)
      .eq('id', incomeId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async deleteRecurringIncome(incomeId: string) {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', incomeId);

    if (error) throw error;
  },

  async toggleRecurringIncome(incomeId: string, active: boolean) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ active })
      .eq('id', incomeId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async createRecurringExpense(expenseData: Partial<RecurringExpense>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(expenseData)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async updateRecurringExpense(
    expenseData: Partial<RecurringExpense>,
    expenseId: string,
  ) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = expenseData;
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(safeUpdate)
      .eq('id', expenseId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async deleteRecurringExpense(expenseId: string) {
    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', expenseId);

    if (error) throw error;
  },

  async toggleRecurringExpense(expenseId: string, active: boolean) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ active })
      .eq('id', expenseId)
      .select(SELECT_WITH_CATEGORY)
      .single();

    if (error) throw error;

    return data as RecurringExpense;
  },

  async getBudget(signal?: AbortSignal) {
    let query = supabase.from('user_budgets').select('*');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return data as Budget | null;
  },

  async upsertBudget(monthlyAmount: number) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: session.user.id, monthly_amount: monthlyAmount },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async updateDefaultCurrency(currency: string) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: session.user.id, default_currency: currency },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async updateDefaultSavingsPct(pct: number | null) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: session.user.id, default_savings_pct: pct },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async getCategoryBudgets(signal?: AbortSignal) {
    let query = supabase.from('category_budgets').select('*');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as CategoryBudget[];
  },

  async upsertCategoryBudget(categoryId: string, monthlyAmount: number) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('category_budgets')
      .upsert(
        {
          user_id: session.user.id,
          category_id: categoryId,
          monthly_amount: monthlyAmount,
        },
        { onConflict: 'user_id,category_id' },
      )
      .select()
      .single();

    if (error) throw error;

    return data as CategoryBudget;
  },

  async deleteCategoryBudget(categoryId: string) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('category_budgets')
      .delete()
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId);

    if (error) throw error;
  },

  async updateDailyReminderHour(hour: number | null) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // Use upsert: users without a `user_budgets` row (no monthly budget set)
    // would silently no-op with `.update()`.
    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: session.user.id, daily_reminder_hour: hour },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    // Read the user id from the local session — no network round trip.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: session.user.id, notification_preferences: prefs },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async getTemplates(signal?: AbortSignal) {
    let query = supabase
      .from('expense_templates')
      .select(SELECT_TEMPLATE)
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as ExpenseTemplate[];
  },

  async createTemplate(templateData: Partial<ExpenseTemplate>) {
    const { data, error } = await supabase
      .from('expense_templates')
      .insert(templateData)
      .select(SELECT_TEMPLATE)
      .single();

    if (error) throw error;

    return data as ExpenseTemplate;
  },

  async deleteTemplate(templateId: string) {
    const { error } = await supabase
      .from('expense_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
  },

  async getGoals(signal?: AbortSignal) {
    let query = supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Goal[];
  },

  async createGoal(goalData: Partial<Goal>) {
    const { data, error } = await supabase
      .from('goals')
      .insert(goalData)
      .select()
      .single();

    if (error) throw error;

    return data as Goal;
  },

  async updateGoal(goalId: string, goalData: Partial<Goal>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = goalData;
    const { data, error } = await supabase
      .from('goals')
      .update(safeUpdate)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;

    return data as Goal;
  },

  async deleteGoal(goalId: string) {
    const { error } = await supabase.from('goals').delete().eq('id', goalId);

    if (error) throw error;
  },

  async getAccounts(signal?: AbortSignal) {
    let query = supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Account[];
  },

  async createAccount(
    accountData: Partial<Account> & { initial_balance?: number },
  ) {
    const { initial_balance, ...accountFields } = accountData;
    const { data: created, error } = await supabase
      .from('accounts')
      .insert(accountFields)
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
    const { data, error } = await supabase
      .from('accounts')
      .update(safeUpdate)
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;

    return data as Account;
  },

  async archiveAccount(accountId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .update({ is_archived: true })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw error;

    return data as Account;
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

  async getAllAccountBalances(signal?: AbortSignal) {
    return fetchAllPages<AccountBalance>((from, to) => {
      let query = supabase
        .from('account_balances')
        .select('*')
        .order('recorded_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);
      if (signal) query = query.abortSignal(signal);

      return query;
    });
  },

  async createAccountBalance(snapshot: Partial<AccountBalance>) {
    const { data, error } = await supabase
      .from('account_balances')
      .insert(snapshot)
      .select()
      .single();

    if (error) throw error;

    return data as AccountBalance;
  },

  async upsertAccountBalance(snapshot: Partial<AccountBalance>) {
    // Atomic upsert via Postgres function — preserves a same-day
    // contribution_delta when the caller didn't supply one. Replaces an
    // earlier client-side SELECT-then-UPSERT that had a TOCTOU race when
    // two devices logged into the same account wrote on the same day.
    if (!snapshot.account_id || snapshot.balance == null) {
      throw new Error('account_id and balance are required');
    }

    const { data, error } = await supabase.rpc('upsert_account_balance', {
      p_account_id: snapshot.account_id,
      p_balance: snapshot.balance,
      p_contribution_delta: snapshot.contribution_delta ?? null,
      p_recorded_at: snapshot.recorded_at ?? null,
      p_note: snapshot.note ?? null,
      p_original_amount: snapshot.original_amount ?? null,
      p_original_currency: snapshot.original_currency ?? null,
      p_exchange_rate: snapshot.exchange_rate ?? null,
    });

    if (error) throw error;

    return data as AccountBalance;
  },

  async deleteAccountBalance(snapshotId: string) {
    const { error } = await supabase
      .from('account_balances')
      .delete()
      .eq('id', snapshotId);

    if (error) throw error;
  },

  async getAccountById(accountId: string, signal?: AbortSignal) {
    let query = supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.single();

    if (error) throw error;

    return data as Account;
  },

  async getDebts(signal?: AbortSignal) {
    let query = supabase
      .from('debts')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Debt[];
  },

  async getDebtById(debtId: string, signal?: AbortSignal) {
    let query = supabase.from('debts').select('*').eq('id', debtId);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.single();

    if (error) throw error;

    return data as Debt;
  },

  async createDebt(debtData: Partial<Debt>) {
    // Most users only know what they currently owe, not the original loan
    // amount. We treat the entered current_balance as both original_principal
    // and current_balance — the recompute trigger will keep current_balance
    // correct from there as payments are logged.
    const { data, error } = await supabase
      .from('debts')
      .insert({
        ...debtData,
        original_principal: debtData.current_balance,
      })
      .select()
      .single();

    if (error) throw error;

    return data as Debt;
  },

  async updateDebt(debtId: string, debtData: Partial<Debt>) {
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = debtData;
    const { data, error } = await supabase
      .from('debts')
      .update(safeUpdate)
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw error;

    return data as Debt;
  },

  async archiveDebt(debtId: string) {
    const { data, error } = await supabase
      .from('debts')
      .update({ is_archived: true })
      .eq('id', debtId)
      .select()
      .single();

    if (error) throw error;

    return data as Debt;
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
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete account');
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
