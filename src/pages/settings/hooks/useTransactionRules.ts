import { useCallback, useEffect, useState } from 'react';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { transactionRuleService } from '@/common/api/transactionRuleService';
import type { TransactionRule } from '@/types/TransactionRule';

export const useTransactionRules = () => {
  const { activeOwnerId } = useFinancialSpace();
  const [state, setState] = useState(() => initialState(activeOwnerId));
  const [revision, setRevision] = useState(0);
  if (state.ownerId !== activeOwnerId) {
    setState(initialState(activeOwnerId));
  }

  useEffect(() => {
    const controller = new AbortController();
    void transactionRuleService
      .getRules(activeOwnerId, controller.signal)
      .then((rules) => {
        if (!controller.signal.aborted) {
          setState({
            ownerId: activeOwnerId,
            rules,
            isLoading: false,
            hasError: false,
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({
            ownerId: activeOwnerId,
            rules: [],
            isLoading: false,
            hasError: true,
          });
        }
      });

    return () => controller.abort();
  }, [activeOwnerId, revision]);

  const setRules = useCallback(
    (
      update:
        TransactionRule[] | ((current: TransactionRule[]) => TransactionRule[]),
    ) => {
      setState((current) => {
        if (current.ownerId !== activeOwnerId) {
          return current;
        }
        let rules: TransactionRule[];
        if (typeof update === 'function') {
          rules = update(current.rules);
        } else {
          rules = update;
        }

        return { ...current, rules };
      });
    },
    [activeOwnerId],
  );

  const retry = () => {
    setState(initialState(activeOwnerId));
    setRevision((current) => current + 1);
  };

  return { ...state, setRules, retry };
};

type RulesState = {
  ownerId: string;
  rules: TransactionRule[];
  isLoading: boolean;
  hasError: boolean;
};

const initialState = (ownerId: string): RulesState => ({
  ownerId,
  rules: [],
  isLoading: true,
  hasError: false,
});
