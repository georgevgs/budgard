import { useEffect, useState } from 'react';
import { useFinancialSpace } from '@/common/contexts/FinancialSpaceContext';
import { settingsApi } from '@/pages/settings/settingsApi';
import type { FinancialConnection } from '@/types/FinancialConnection';

export const useFinancialConnections = () => {
  const { activeOwnerId } = useFinancialSpace();
  const [state, setState] = useState(() => initialState(activeOwnerId));
  if (state.ownerId !== activeOwnerId) {
    setState(initialState(activeOwnerId));
  }

  useEffect(() => {
    const controller = new AbortController();
    void settingsApi
      .getFinancialConnections(activeOwnerId, controller.signal)
      .then((connections) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          ownerId: activeOwnerId,
          connections,
          isLoading: false,
          hasError: false,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          ownerId: activeOwnerId,
          connections: [],
          isLoading: false,
          hasError: true,
        });
      });

    return () => controller.abort();
  }, [activeOwnerId]);

  return {
    connections: state.connections,
    isLoading: state.isLoading,
    hasError: state.hasError,
  };
};

// --- Helpers ---

type ConnectionState = {
  ownerId: string;
  connections: FinancialConnection[];
  isLoading: boolean;
  hasError: boolean;
};

const initialState = (ownerId: string): ConnectionState => ({
  ownerId,
  connections: [],
  isLoading: true,
  hasError: false,
});
