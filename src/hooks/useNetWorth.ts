import { useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/react';
import { format } from 'date-fns';
import { useData } from '@/contexts/DataContext';
import { fetchExchangeRate } from '@/services/exchangeRateService';
import { type AccountKind, isLiability } from '@/types/Account';
import type { AccountBalance } from '@/types/AccountBalance';

export type NetWorthPoint = {
  date: string;
  total: number;
  assets: number;
  liabilities: number;
}

export type NetWorthSummary = {
  total: number;
  assets: number;
  liabilities: number;
  byKind: Partial<Record<AccountKind, number>>;
  investmentValue: number;
  investmentCostBasis: number;
  investmentGain: number;
  // Currencies whose exchange rate could not be fetched. When non-empty, the
  // total above mixes raw foreign-currency balances at rate=1 — the UI must
  // surface this so users don't trust the headline number blindly.
  staleCurrencies: string[];
}

const RATE_KEY = (currency: string, date: string) => `${currency}|${date}`;

export const useNetWorth = () => {
  const { accounts, accountBalances, defaultCurrency } = useData();
  const [rates, setRates] = useState<Map<string, number>>(new Map());
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());
  const [isComputing, setIsComputing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Collect every (currency, date) pair we'll need a rate for.
    const required = new Set<string>();
    accounts.forEach((a) => {
      if (a.default_currency !== defaultCurrency) {
        required.add(RATE_KEY(a.default_currency, today));
      }
    });
    accountBalances.forEach((b) => {
      const acc = accounts.find((a) => a.id === b.account_id);
      if (!acc) {
        return;
      }
      if (acc.default_currency !== defaultCurrency) {
        required.add(RATE_KEY(acc.default_currency, b.recorded_at));
      }
    });

    if (required.size === 0) {
      setRates(new Map());
      setFailedKeys(new Set());
      setIsComputing(false);
      return;
    }

    setIsComputing(true);
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
      setRates(new Map(results.map((r) => [r.key, r.rate])));
      setFailedKeys(new Set(results.filter((r) => r.failed).map((r) => r.key)));
      setIsComputing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [accounts, accountBalances, defaultCurrency]);

  const summary = useMemo<NetWorthSummary>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    let assets = 0;
    let liabilities = 0;
    let investmentValue = 0;
    let investmentCostBasis = 0;
    const byKind: Partial<Record<AccountKind, number>> = {};
    const staleCurrencies = new Set<string>();

    accounts.forEach((a) => {
      let rate = 1;
      if (a.default_currency !== defaultCurrency) {
        const key = RATE_KEY(a.default_currency, today);
        if (failedKeys.has(key)) {
          staleCurrencies.add(a.default_currency);
        }
        rate = rates.get(key) ?? 1;
      }
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

    return {
      total: assets - liabilities,
      assets,
      liabilities,
      byKind,
      investmentValue,
      investmentCostBasis,
      investmentGain: investmentValue - investmentCostBasis,
      staleCurrencies: Array.from(staleCurrencies).sort(),
    };
  }, [accounts, rates, failedKeys, defaultCurrency]);

  const series = useMemo<NetWorthPoint[]>(() => {
    if (accounts.length === 0 || accountBalances.length === 0) {
      return [];
    }

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

        const rate =
          a.default_currency === defaultCurrency
            ? 1
            : rates.get(RATE_KEY(a.default_currency, latest.recorded_at)) ?? 1;
        const balance = latest.balance * rate;

        if (isLiability(a.kind)) {
          liabilities += balance;
          return;
        }
        assets += balance;
      });

      return {
        date,
        total: assets - liabilities,
        assets,
        liabilities,
      };
    });
  }, [accounts, accountBalances, rates, defaultCurrency]);

  return { summary, series, isComputing };
};
