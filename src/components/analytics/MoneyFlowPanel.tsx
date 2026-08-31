import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import Waves from 'lucide-react/dist/esm/icons/waves';
import FlowChart from '@/components/charts/FlowChart';
import type { FlowNode } from '@/components/charts/FlowChart';
import {
  UNCATEGORIZED_ID,
  OTHER_ID,
  type MoneyFlowData,
  type MoneyFlowCategory,
} from '@/hooks/analytics/useMoneyFlowData';
import { formatCurrency } from '@/lib/utils';

type Props = {
  flow: MoneyFlowData;
  currency: string;
};

// The chart half of the money-flow view — CashFlowSection owns the stats
// row (it swaps between year totals and this month's, so it stays in one
// place) and renders this alongside it when the flow toggle is active.
const MoneyFlowPanel = ({ flow, currency }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!flow.hasData) {
    return (
      <EmptyStateCard
        media={<Waves className="h-10 w-10 text-muted-foreground/50" />}
        title={t('moneyFlow.emptyTitle')}
        description={t('moneyFlow.emptyDescription')}
        actionLabel={t('expenses.addExpense')}
        onAction={() => navigate('/today?action=add')}
      />
    );
  }

  const nodes = buildNodes(flow, t);

  return (
    <FlowChart
      sourceLabel={t('moneyFlow.income')}
      sourceSublabel={formatCurrency(flow.income, currency)}
      sourceValue={flow.income}
      nodes={nodes}
      ariaLabel={buildAriaLabel(flow, currency, t)}
    />
  );
};

export default MoneyFlowPanel;

// --- Helpers ---

type TFunc = ReturnType<typeof useTranslation>['t'];

const categoryLabel = (category: MoneyFlowCategory, t: TFunc): string => {
  if (category.id === UNCATEGORIZED_ID) {
    return t('moneyFlow.uncategorized');
  }
  if (category.id === OTHER_ID) {
    return t('moneyFlow.other');
  }

  return category.name;
};

const buildNodes = (flow: MoneyFlowData, t: TFunc): FlowNode[] => {
  const colors = resolveCategoryColors(flow.categories);
  const nodes: FlowNode[] = [];

  if (!flow.isDeficit && flow.savings > 0) {
    nodes.push({
      id: 'savings',
      label: t('moneyFlow.savings'),
      sublabel: `${formatPercent(flow.savings, flow.income)}%`,
      value: flow.savings,
      color: 'hsl(var(--income))',
    });
  }

  for (const category of flow.categories) {
    nodes.push({
      id: category.id,
      label: categoryLabel(category, t),
      sublabel: `${formatPercent(category.amount, flow.totalExpenses)}%`,
      value: category.amount,
      color: colors.get(category.id) ?? category.color,
    });
  }

  return nodes;
};

// Each category carries the colour the user picked for it (same source as
// DonutChart and every category badge). Two categories can honestly land on
// the same swatch — the picker only offers so many — so a collision gets the
// same treatment a parent/child pair would: same hue, stepped lightness,
// rather than two branches that are indistinguishable at a glance.
const resolveCategoryColors = (
  categories: MoneyFlowCategory[],
): Map<string, string> => {
  const groups = new Map<string, MoneyFlowCategory[]>();
  for (const category of categories) {
    const group = groups.get(category.color) ?? [];
    group.push(category);
    groups.set(category.color, group);
  }

  const resolved = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      resolved.set(group[0].id, group[0].color);
      continue;
    }
    for (const [index, category] of group.entries()) {
      resolved.set(category.id, shadeStep(category.color, index, group.length));
    }
  }

  return resolved;
};

// N variants spread symmetrically around the picked colour — an odd-sized
// group keeps its middle member at the exact picked value. Positive steps
// mix toward white, negative toward black; the spread widens slightly with
// group size so more colliding categories stay just as distinguishable.
const shadeStep = (hex: string, index: number, count: number): string => {
  if (count <= 1) {
    return hex;
  }

  const spread = Math.min(34, 16 + (count - 1) * 5);
  const step = (spread * 2) / (count - 1);
  const percent = -spread + index * step;

  return mixTint(hex, percent);
};

const mixTint = (hex: string, percent: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const target = percent >= 0 ? 255 : 0;
  const amount = Math.min(1, Math.abs(percent) / 100);
  const mix = (channel: number) =>
    Math.round(channel + (target - channel) * amount);

  return rgbToHex(mix(r), mix(g), mix(b));
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = hex.replace('#', '');

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');

  return `#${channel(r)}${channel(g)}${channel(b)}`;
};

const formatPercent = (part: number, whole: number): string => {
  if (whole <= 0) {
    return '0';
  }

  return Math.round((part / whole) * 100).toString();
};

const buildAriaLabel = (
  flow: MoneyFlowData,
  currency: string,
  t: TFunc,
): string => {
  const categoryList = flow.categories
    .map(
      (category) =>
        `${categoryLabel(category, t)} ${formatCurrency(category.amount, currency)}`,
    )
    .join(', ');

  return t('moneyFlow.chartSummary', {
    income: formatCurrency(flow.income, currency),
    categories: categoryList,
  });
};
