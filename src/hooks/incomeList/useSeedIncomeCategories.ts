import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCategoriesData, useDataConfig } from '@/contexts/DataContext';
import { useCategoryOps } from '@/hooks/dataOps/useCategoryOps';

const DEFAULT_INCOME_CATEGORIES: Array<{
  nameKey: string;
  color: string;
  icon: string;
}> = [
  { nameKey: 'income.defaults.salary', color: '#10b981', icon: '💼' },
  { nameKey: 'income.defaults.freelance', color: '#22c55e', icon: '💻' },
  { nameKey: 'income.defaults.refund', color: '#06b6d4', icon: '↩️' },
  { nameKey: 'income.defaults.gift', color: '#a855f7', icon: '🎁' },
  { nameKey: 'income.defaults.investment', color: '#3b82f6', icon: '📈' },
];

// Seed default income categories once when none exist
export const useSeedIncomeCategories = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { incomeCategories } = useCategoriesData();
  const { isInitialized } = useDataConfig();
  const { handleCategoriesAddBulk } = useCategoryOps();
  const seededRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (seededRef.current) return;
    if (!session?.user?.id) return;
    if (incomeCategories.length > 0) return;

    seededRef.current = true;
    const userId = session.user.id;
    const seedData = DEFAULT_INCOME_CATEGORIES.map((c) => ({
      name: t(c.nameKey),
      color: c.color,
      icon: c.icon,
      user_id: userId,
      type: 'income' as const,
      kind: 'income' as const,
    }));

    handleCategoriesAddBulk(seedData).catch(() => {
      seededRef.current = false;
    });
  }, [
    isInitialized,
    incomeCategories.length,
    session?.user?.id,
    handleCategoriesAddBulk,
    t,
  ]);
};
