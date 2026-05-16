import { supabase } from '@/lib/supabase';
import type { Budget, NotificationPreferences } from '@/types/Budget';
import type { CategoryBudget } from '@/types/CategoryBudget';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';
import type { Tag } from '@/types/Tag';
import type { ExpenseTemplate } from '@/types/ExpenseTemplate';
import type { Goal } from '@/types/Goal';
import type { Account } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';

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
    let query = supabase
      .from('expenses')
      .select(`*, category:categories(*), tag:tags(*)`)
      .eq('type', 'expense')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (sinceDate) query = query.gte('date', sinceDate);
    if (beforeDate) query = query.lt('date', beforeDate);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Expense[];
  },

  async getIncomes(
    signal?: AbortSignal,
    sinceDate?: string,
    beforeDate?: string,
  ) {
    let query = supabase
      .from('expenses')
      .select(`*, category:categories(*)`)
      .eq('type', 'income')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (sinceDate) query = query.gte('date', sinceDate);
    if (beforeDate) query = query.lt('date', beforeDate);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Expense[];
  },

  async createIncome(incomeData: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...incomeData, type: 'income' })
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
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

  async updateExpense(expenseData: Partial<Expense>, expenseId: string) {
    // Strip immutable fields — user_id, id, created_at must never be changed via update.
    // RLS WITH CHECK also enforces this server-side, but stripping client-side is defence-in-depth.
    const { user_id: _u, id: _i, created_at: _c, ...safeUpdate } = expenseData;
    const { data, error } = await supabase
      .from('expenses')
      .update(safeUpdate)
      .eq('id', expenseId)
      .select(`*, category:categories(*), tag:tags(*)`)
      .single();

    if (error) throw error;
    return data as Expense;
  },

  async createExpense(expenseData: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expenseData)
      .select(`*, category:categories(*), tag:tags(*)`)
      .single();

    if (error) throw error;
    return data as Expense;
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
      .select(`*, category:categories(*), tag:tags(*)`);

    if (error) throw error;
    return data as Expense[];
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
      .select(
        `
               *,
               category:categories(*)
           `,
      )
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
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  async createRecurringExpense(expenseData: Partial<RecurringExpense>) {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert(expenseData)
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
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
      .select(`*, category:categories(*)`)
      .single();

    if (error) throw error;
    return data as RecurringExpense;
  },

  async processRecurringExpenses(targetDate?: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-recurring-expenses`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_date: targetDate || new Date().toISOString().split('T')[0],
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process recurring expenses');
    }

    return response.json() as Promise<{
      success: boolean;
      generated_count: number;
      processed_recurring_ids: string[];
      target_date: string;
    }>;
  },

  async getBudget(signal?: AbortSignal) {
    let query = supabase.from('user_budgets').select('*');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    return data as Budget | null;
  },

  async upsertBudget(monthlyAmount: number) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, monthly_amount: monthlyAmount },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Budget;
  },

  async updateDefaultCurrency(currency: string) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, default_currency: currency },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;
    return data as Budget;
  },

  async updateDefaultSavingsPct(pct: number | null) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, default_savings_pct: pct },
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
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('category_budgets')
      .upsert(
        {
          user_id: user.id,
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
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('category_budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId);

    if (error) throw error;
  },

  async updateDailyReminderHour(hour: number | null) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use upsert: users without a `user_budgets` row (no monthly budget set)
    // would silently no-op with `.update()`.
    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, daily_reminder_hour: hour },
        { onConflict: 'user_id' },
      )
      .select()
      .maybeSingle();

    if (error) throw error;

    return data as Budget;
  },

  async updateNotificationPreferences(prefs: NotificationPreferences) {
    const user = await this.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_budgets')
      .upsert(
        { user_id: user.id, notification_preferences: prefs },
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
      .select(`*, category:categories(*), tag:tags(*)`)
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
      .select(`*, category:categories(*), tag:tags(*)`)
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
    let query = supabase
      .from('account_balances')
      .select('*')
      .eq('account_id', accountId)
      .order('recorded_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as AccountBalance[];
  },

  async getAllAccountBalances(signal?: AbortSignal) {
    let query = supabase
      .from('account_balances')
      .select('*')
      .order('recorded_at', { ascending: true });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as AccountBalance[];
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
    let query = supabase
      .from('expenses')
      .select(`*, category:categories(*)`)
      .eq('debt_id', debtId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) throw error;

    return data as Expense[];
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
