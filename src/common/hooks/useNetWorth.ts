import { useEffect, useMemo, useState } from 'react';
import { captureException } from '@/config/sentry';
import { format } from 'date-fns';
import {
  useAccountsData,
  useDataConfig,
  useDebtsData,
} from '@/common/contexts/DataContext';
import { fetchExchangeRate } from '@/common/api/exchangeRateService';
import { type Account, type AccountKind, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';
import type { Debt } from '@/types/Debt';

export type NetWorthPoint = {
  date: string;
  total: number;
  assets: number;
  liabilities: number;
};

export type NetWorthSummary = {
  total: number;
  assets: number;
  liabilities: number;
  // Active-debt balance from the dedicated `debts` table (currency-converted).
  // Already included in `liabilities`; surfaced separately so the UI can break
  // out "of which: debts" if needed.
  debts: number;
  byKind: Partial<Record<AccountKind, number>>;
  investmentValue: number;
  investmentCostBasis: number;
  investmentGain: number;
  // Currencies whose exchange rate could not be fetched. When non-empty, the
  // total above mixes raw foreign-currency balances at rate=1 — the UI must
  // surface this so users don't trust the headline number blindly.
  staleCurrencies: string[];
};

/**
 * The rate to convert `currency` into the default, recording any currency the
 * app could not price.
 *
 * Falling back to 1 is only defensible when the UI says so, and it did for a
 * FAILED fetch. It did not for a MISSING one: while a new requirement set is
 * being fetched, `rates` and `failedKeys` are both the previous computation,
 * so a newly added foreign account converted at 1.0 with staleCurrencies
 * empty — a 2,000,000 yen account reading as 2,000,000 euro with no warning.
 * A key that is absent is now treated exactly like one that failed.
 */
const resolveRate = ({
  currency,
  defaultCurrency,
  date,
  rates,
  failedKeys,
  staleCurrencies,
}: {
  currency: string;
  defaultCurrency: string;
  date: string;
  rates: Map<string, number>;
  failedKeys: Set<string>;
  staleCurrencies: Set<string>;
}): number => {
  if (currency === defaultCurrency) {
    return 1;
  }

  const key = RATE_KEY(currency, date);
  const rate = rates.get(key);

  if (rate === undefined || failedKeys.has(key)) {
    staleCurrencies.add(currency);

    return 1;
  }

  return rate;
};

const isLiveDebt = (d: Debt): boolean =>
  !d.is_archived && !d.is_completed && Number(d.current_balance) > 0;

const RATE_KEY = (currency: string, date: string) => `${currency}|${date}`;

type RateComputation = {
  // Serialized `required` set this computation answered, so staleness is a
  // plain key comparison instead of extra state juggled inside the effect.
  key: string;
  rates: Map<string, number>;
  failedKeys: Set<string>;
};

// Stable empties so the derived values below don't bust the summary/series
// memos with a fresh identity every render.
const EMPTY_RATES: Map<string, number> = new Map();
const EMPTY_FAILED_KEYS: Set<string> = new Set();
const EMPTY_BALANCES: AccountBalance[] = [];

export const useNetWorth = (shouldIncludeHistory = true) => {
  const { accounts, accountBalances: storedBalances } = useAccountsData();
  const debts = useDebtsData();
  const { defaultCurrency } = useDataConfig();
  const [rateComputation, setRateComputation] =
    useState<RateComputation | null>(null);

  let accountBalances = EMPTY_BALANCES;
  if (shouldIncludeHistory) {
    accountBalances = storedBalances;
  }

  // Every (currency, date) pair a rate is needed for.
  const required = useMemo(
    () =>
      collectRequiredRates(accounts, accountBalances, debts, defaultCurrency),
    [accounts, accountBalances, debts, defaultCurrency],
  );

  const requiredKey = useMemo(
    () => Array.from(required).sort().join(','),
    [required],
  );

  useEffect(() => {
    if (required.size === 0) {
      return;
    }

    let cancelled = false;
    void fetchRates(required, requiredKey, defaultCurrency).then(
      (computation) => {
        if (cancelled) {
          return;
        }
        setRateComputation(computation);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [required, requiredKey, defaultCurrency]);

  // Derived: nothing to convert means empty maps; while a new requirement set
  // is being fetched the previous computation keeps serving (stale-while-
  // computing, matching the old behavior of only replacing rates on
  // completion).
  const rates = deriveRates(required, rateComputation);
  const failedKeys = deriveFailedKeys(required, rateComputation);
  const isComputing = required.size > 0 && rateComputation?.key !== requiredKey;

  const summary = useMemo<NetWorthSummary>(
    () => buildSummary(accounts, debts, rates, failedKeys, defaultCurrency),
    [accounts, debts, rates, failedKeys, defaultCurrency],
  );

  const series = useMemo<NetWorthPoint[]>(
    () => buildSeries(accounts, accountBalances, debts, rates, defaultCurrency),
    [accounts, accountBalances, debts, rates, defaultCurrency],
  );

  return { summary, series, isComputing };
};

const collectRequiredRates = (
  accounts: Account[],
  accountBalances: AccountBalance[],
  debts: Debt[],
  defaultCurrency: string,
): Set<string> => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const pairs = new Set<string>();

  accounts.forEach((account) => {
    if (account.default_currency !== defaultCurrency) {
      pairs.add(RATE_KEY(account.default_currency, today));
    }
  });
  accountBalances.forEach((balance) => {
    const account = accounts.find((a) => a.id === balance.account_id);
    if (!account) {
      return;
    }
    if (account.default_currency !== defaultCurrency) {
      pairs.add(RATE_KEY(account.default_currency, balance.recorded_at));
    }
  });
  debts.forEach((debt) => {
    if (!isLiveDebt(debt)) {
      return;
    }
    if (debt.currency !== defaultCurrency) {
      pairs.add(RATE_KEY(debt.currency, today));
    }
  });

  return pairs;
};

type RateResult = { key: string; rate: number; hasFailed: boolean };

// A rate that cannot be fetched falls back to 1 and is recorded as failed, so
// resolveRate can name the currency in staleCurrencies rather than let the
// headline quietly mix currencies.
const fetchOneRate = async (
  key: string,
  defaultCurrency: string,
): Promise<RateResult> => {
  const [currency, date] = key.split('|');
  try {
    const rate = await fetchExchangeRate(
      currency,
      date,
      undefined,
      defaultCurrency,
    );

    return { key, rate, hasFailed: false };
  } catch (error) {
    captureException(error, {
      tags: { context: 'useNetWorth.fetchExchangeRate' },
    });

    return { key, rate: 1, hasFailed: true };
  }
};

const fetchRates = async (
  required: Set<string>,
  requiredKey: string,
  defaultCurrency: string,
): Promise<RateComputation> => {
  const results = await Promise.all(
    Array.from(required).map((key) => fetchOneRate(key, defaultCurrency)),
  );

  return {
    key: requiredKey,
    rates: new Map(results.map((result) => [result.key, result.rate])),
    failedKeys: new Set(
      results.filter((result) => result.hasFailed).map((result) => result.key),
    ),
  };
};

const buildSummary = (
  accounts: Account[],
  debts: Debt[],
  rates: Map<string, number>,
  failedKeys: Set<string>,
  defaultCurrency: string,
): NetWorthSummary => {
  const today = format(new Date(), 'yyyy-MM-dd');
  let assets = 0;
  let liabilities = 0;
  let debtsTotal = 0;
  let investmentValue = 0;
  let investmentCostBasis = 0;
  const byKind: Partial<Record<AccountKind, number>> = {};
  const staleCurrencies = new Set<string>();

  accounts.forEach((account) => {
    const rate = resolveRate({
      currency: account.default_currency,
      defaultCurrency,
      date: today,
      rates,
      failedKeys,
      staleCurrencies,
    });
    const balance = account.current_balance * rate;

    if (isLiability(account.kind)) {
      liabilities += balance;
    } else {
      assets += balance;
    }
    byKind[account.kind] = (byKind[account.kind] ?? 0) + balance;

    if (account.kind === 'investment') {
      investmentValue += balance;
      investmentCostBasis += account.cost_basis * rate;
    }
  });

  debts.forEach((debt) => {
    if (!isLiveDebt(debt)) {
      return;
    }
    const rate = resolveRate({
      currency: debt.currency,
      defaultCurrency,
      date: today,
      rates,
      failedKeys,
      staleCurrencies,
    });
    debtsTotal += Number(debt.current_balance) * rate;
  });

  liabilities += debtsTotal;

  return {
    total: assets - liabilities,
    assets,
    liabilities,
    debts: debtsTotal,
    byKind,
    investmentValue,
    investmentCostBasis,
    investmentGain: investmentValue - investmentCostBasis,
    staleCurrencies: Array.from(staleCurrencies).sort(),
  };
};

// We do not track per-day debt history, so today's debt total is subtracted
// uniformly across every historical point. That keeps the latest series value
// aligned with the header summary, at the cost of understating past net worth
// (debt was likely higher then).
const todaysDebtTotal = (
  debts: Debt[],
  rates: Map<string, number>,
  defaultCurrency: string,
): number => {
  const today = format(new Date(), 'yyyy-MM-dd');
  let total = 0;

  debts.forEach((debt) => {
    if (!isLiveDebt(debt)) {
      return;
    }
    let rate = 1;
    if (debt.currency !== defaultCurrency) {
      rate = rates.get(RATE_KEY(debt.currency, today)) ?? 1;
    }
    total += Number(debt.current_balance) * rate;
  });

  return total;
};

const groupBalancesByAccount = (
  accountBalances: AccountBalance[],
): Map<string, AccountBalance[]> => {
  const byAccount = new Map<string, AccountBalance[]>();

  accountBalances.forEach((balance) => {
    const existing = byAccount.get(balance.account_id);
    if (existing) {
      existing.push(balance);

      return;
    }
    byAccount.set(balance.account_id, [balance]);
  });
  byAccount.forEach((list) =>
    list.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
  );

  return byAccount;
};

// Forward-fill: the most recent snapshot at or before `date`.
const snapshotAt = (
  history: AccountBalance[],
  date: string,
): AccountBalance | undefined => {
  let latest: AccountBalance | undefined;

  for (const snapshot of history) {
    if (snapshot.recorded_at <= date) {
      latest = snapshot;
      continue;
    }
    break;
  }

  return latest;
};

const pointAt = (
  date: string,
  accounts: Account[],
  byAccount: Map<string, AccountBalance[]>,
  rates: Map<string, number>,
  defaultCurrency: string,
  debtConstant: number,
): NetWorthPoint => {
  let assets = 0;
  let liabilities = 0;

  accounts.forEach((account) => {
    const history = byAccount.get(account.id);
    if (!history) {
      return;
    }
    const latest = snapshotAt(history, date);
    if (!latest) {
      return;
    }

    let rate = 1;
    if (account.default_currency !== defaultCurrency) {
      rate =
        rates.get(RATE_KEY(account.default_currency, latest.recorded_at)) ?? 1;
    }
    const balance = latest.balance * rate;

    if (isLiability(account.kind)) {
      liabilities += balance;

      return;
    }
    assets += balance;
  });

  const liabilitiesWithDebt = liabilities + debtConstant;

  return {
    date,
    total: assets - liabilitiesWithDebt,
    assets,
    liabilities: liabilitiesWithDebt,
  };
};

const buildSeries = (
  accounts: Account[],
  accountBalances: AccountBalance[],
  debts: Debt[],
  rates: Map<string, number>,
  defaultCurrency: string,
): NetWorthPoint[] => {
  if (accounts.length === 0 || accountBalances.length === 0) {
    return [];
  }

  const debtConstant = todaysDebtTotal(debts, rates, defaultCurrency);
  const byAccount = groupBalancesByAccount(accountBalances);
  const allDates = Array.from(
    new Set(accountBalances.map((balance) => balance.recorded_at)),
  ).sort();

  return allDates.map((date) =>
    pointAt(date, accounts, byAccount, rates, defaultCurrency, debtConstant),
  );
};

const deriveRates = (
  required: Set<string>,
  computation: RateComputation | null,
): Map<string, number> => {
  if (required.size === 0 || computation === null) {
    return EMPTY_RATES;
  }

  return computation.rates;
};

const deriveFailedKeys = (
  required: Set<string>,
  computation: RateComputation | null,
): Set<string> => {
  if (required.size === 0 || computation === null) {
    return EMPTY_FAILED_KEYS;
  }

  return computation.failedKeys;
};
