import { useEffect, useMemo, useState } from 'react';
import * as Sentry from '@/lib/sentry';
import { format } from 'date-fns';
import {
  useAccountsData,
  useDataConfig,
  useDebtsData,
} from '@/contexts/DataContext';
import { fetchExchangeRate } from '@/services/exchangeRateService';
import { type AccountKind, isLiability } from '@/types/Account';
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

export const useNetWorth = () => {
  const { accounts, accountBalances } = useAccountsData();
  const debts = useDebtsData();
  const { defaultCurrency } = useDataConfig();
  const [rateComputation, setRateComputation] =
    useState<RateComputation | null>(null);

  // Collect every (currency, date) pair we'll need a rate for.
  const required = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const pairs = new Set<string>();
    accounts.forEach((a) => {
      if (a.default_currency !== defaultCurrency) {
        pairs.add(RATE_KEY(a.default_currency, today));
      }
    });
    accountBalances.forEach((b) => {
      const acc = accounts.find((a) => a.id === b.account_id);
      if (!acc) {
        return;
      }
      if (acc.default_currency !== defaultCurrency) {
        pairs.add(RATE_KEY(acc.default_currency, b.recorded_at));
      }
    });
    debts.forEach((d) => {
      if (!isLiveDebt(d)) {
        return;
      }
      if (d.currency !== defaultCurrency) {
        pairs.add(RATE_KEY(d.currency, today));
      }
    });

    return pairs;
  }, [accounts, accountBalances, debts, defaultCurrency]);

  const requiredKey = useMemo(
    () => Array.from(required).sort().join(','),
    [required],
  );

  useEffect(() => {
    if (required.size === 0) {
      return;
    }

    let cancelled = false;
    (async () => {
      type RateResult = { key: string; rate: number; failed: boolean };
      const results = await Promise.all(
        Array.from(required).map(async (key): Promise<RateResult> => {
          const [ccy, date] = key.split('|');
          try {
            const rate = await fetchExchangeRate(
              ccy,
              date,
              undefined,
              defaultCurrency,
            );

            return { key, rate, failed: false };
          } catch (error) {
            Sentry.captureException(error, {
              tags: { context: 'useNetWorth.fetchExchangeRate' },
            });

            return { key, rate: 1, failed: true };
          }
        }),
      );
      if (cancelled) {
        return;
      }
      setRateComputation({
        key: requiredKey,
        rates: new Map(results.map((r) => [r.key, r.rate])),
        failedKeys: new Set(results.filter((r) => r.failed).map((r) => r.key)),
      });
    })();

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

  const summary = useMemo<NetWorthSummary>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let assets = 0;
    let liabilities = 0;
    let debtsTotal = 0;
    let investmentValue = 0;
    let investmentCostBasis = 0;
    const byKind: Partial<Record<AccountKind, number>> = {};
    const staleCurrencies = new Set<string>();

    accounts.forEach((a) => {
      const rate = resolveRate({
        currency: a.default_currency,
        defaultCurrency,
        date: today,
        rates,
        failedKeys,
        staleCurrencies,
      });
      const balance = a.current_balance * rate;

      if (isLiability(a.kind)) {
        liabilities += balance;
      } else {
        assets += balance;
      }
      byKind[a.kind] = (byKind[a.kind] ?? 0) + balance;

      if (a.kind === 'investment') {
        investmentValue += balance;
        investmentCostBasis += a.cost_basis * rate;
      }
    });

    debts.forEach((d) => {
      if (!isLiveDebt(d)) {
        return;
      }
      const rate = resolveRate({
        currency: d.currency,
        defaultCurrency,
        date: today,
        rates,
        failedKeys,
        staleCurrencies,
      });
      debtsTotal += Number(d.current_balance) * rate;
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
  }, [accounts, debts, rates, failedKeys, defaultCurrency]);

  const series = useMemo<NetWorthPoint[]>(() => {
    if (accounts.length === 0 || accountBalances.length === 0) {
      return [];
    }

    // We don't track per-day debt history, so subtract today's debt total
    // uniformly across every historical point. This keeps the latest series
    // value aligned with the header summary at the cost of understating past
    // net worth (debt was likely higher then).
    const today = format(new Date(), 'yyyy-MM-dd');
    let debtConstant = 0;
    debts.forEach((d) => {
      if (!isLiveDebt(d)) {
        return;
      }
      let rate = 1;
      if (d.currency !== defaultCurrency) {
        rate = rates.get(RATE_KEY(d.currency, today)) ?? 1;
      }

      debtConstant += Number(d.current_balance) * rate;
    });

    const byAccount = new Map<string, AccountBalance[]>();
    accountBalances.forEach((b) => {
      const arr = byAccount.get(b.account_id);
      if (arr) {
        arr.push(b);

        return;
      }
      byAccount.set(b.account_id, [b]);
    });
    byAccount.forEach((arr) =>
      arr.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
    );

    const allDates = Array.from(
      new Set(accountBalances.map((b) => b.recorded_at)),
    ).sort();

    return allDates.map((date) => {
      let assets = 0;
      let liabilities = 0;

      accounts.forEach((a) => {
        const history = byAccount.get(a.id);
        if (!history) {
          return;
        }
        // Forward-fill: the most recent snapshot at or before `date`.
        let latest: AccountBalance | undefined;
        for (const snap of history) {
          if (snap.recorded_at <= date) {
            latest = snap;
            continue;
          }
          break;
        }
        if (!latest) {
          return;
        }

        let rate = 1;
        if (a.default_currency !== defaultCurrency) {
          rate =
            rates.get(RATE_KEY(a.default_currency, latest.recorded_at)) ?? 1;
        }

        const balance = latest.balance * rate;

        if (isLiability(a.kind)) {
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
    });
  }, [accounts, accountBalances, debts, rates, defaultCurrency]);

  return { summary, series, isComputing };
};

// --- Helpers ---

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
