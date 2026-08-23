import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
};

// The year the whole screen is about, in the header's trailing slot. It used
// to sit halfway down beside the chart, which made it look like the chart's
// control rather than the screen's — every figure on Trends moves when this
// changes, so it belongs where the screen names itself.
const YearPill = ({ selectedYear, availableYears, onYearChange }: Props) => {
  const { t } = useTranslation();

  return (
    <Select
      value={selectedYear.toString()}
      onValueChange={(value) => onYearChange(Number.parseInt(value, 10))}
    >
      <SelectTrigger
        className="h-10 w-auto gap-1.5 rounded-full border-0 bg-tile px-3.5 text-xs font-medium shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))]"
        aria-label={t('analytics.selectYear')}
      >
        <SelectValue placeholder={t('analytics.selectYear')} />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default YearPill;
