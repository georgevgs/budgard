import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Button } from '@/common/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/common/ui/select';
import { Switch } from '@/common/ui/switch';
import { Label } from '@/common/ui/label';
import { cn } from '@/constants/utils';
import type {
  ColumnMapping,
  CsvPreviewData,
} from '@/pages/expenses/utils/csvTypes';

interface Props {
  csvPreview: CsvPreviewData;
  columnMapping: ColumnMapping;
  skipIncome: boolean;
  updateColumnMapping: (
    field: keyof ColumnMapping,
    value: number | null,
  ) => void;
  setSkipIncome: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
  t: TranslateFunction;
}

// Which column of the file is the date, the description, the amount and
// (optionally) the category, with a live sample of the file underneath so the
// answer can be checked rather than guessed.
const CsvMappingStep = ({
  csvPreview,
  columnMapping,
  skipIncome,
  updateColumnMapping,
  setSkipIncome,
  onBack,
  onContinue,
  t,
}: Props) => {
  const headers = csvPreview.headers;

  return (
    <div className="flex flex-col space-y-4 pb-4">
      <p className="text-sm text-muted-foreground">
        {t('import.mappingDescription')}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <ColumnSelect
          idPrefix="date"
          label={t('import.dateColumn')}
          value={columnMapping.dateColumn.toString()}
          headers={headers}
          onChange={(value) => updateColumnMapping('dateColumn', parseInt(value))}
          t={t}
        />
        <ColumnSelect
          idPrefix="desc"
          label={t('import.descriptionColumn')}
          value={columnMapping.descriptionColumn.toString()}
          headers={headers}
          onChange={(value) =>
            updateColumnMapping('descriptionColumn', parseInt(value))
          }
          t={t}
        />
        <ColumnSelect
          idPrefix="amount"
          label={t('import.amountColumn')}
          value={columnMapping.amountColumn.toString()}
          headers={headers}
          onChange={(value) =>
            updateColumnMapping('amountColumn', parseInt(value))
          }
          t={t}
        />
        <ColumnSelect
          idPrefix="cat"
          label={t('import.categoryColumn')}
          value={columnMapping.categoryColumn?.toString() ?? NO_COLUMN}
          headers={headers}
          noneLabel={t('import.noCategory')}
          onChange={(value) =>
            updateColumnMapping('categoryColumn', parseCategoryColumnValue(value))
          }
          t={t}
        />
      </div>

      <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
        <div className="space-y-0.5">
          <Label className="text-sm">{t('import.skipIncome')}</Label>
          <p className="text-xs text-muted-foreground">
            {t('import.skipIncomeDescription')}
          </p>
        </div>
        <Switch checked={skipIncome} onCheckedChange={setSkipIncome} />
      </div>

      <SampleTable csvPreview={csvPreview} columnMapping={columnMapping} t={t} />

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" onClick={onBack}>
          {t('import.back')}
        </Button>
        <Button onClick={onContinue}>
          {t('import.continue')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default CsvMappingStep;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

// Radix Select cannot hold an empty string as a value, so "no column" needs a
// sentinel of its own.
const NO_COLUMN = '_none';

interface ColumnSelectProps {
  idPrefix: string;
  label: string;
  value: string;
  headers: string[];
  noneLabel?: string;
  onChange: (value: string) => void;
  t: TranslateFunction;
}

const ColumnSelect = ({
  idPrefix,
  label,
  value,
  headers,
  noneLabel,
  onChange,
  t,
}: ColumnSelectProps) => {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {renderNoneOption(noneLabel)}
          {headers.map((header, index) => (
            <SelectItem key={`${idPrefix}-${index}`} value={index.toString()}>
              {columnLabel(header, index, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const renderNoneOption = (noneLabel?: string) => {
  if (!noneLabel) {
    return null;
  }

  return <SelectItem value={NO_COLUMN}>{noneLabel}</SelectItem>;
};

interface SampleTableProps {
  csvPreview: CsvPreviewData;
  columnMapping: ColumnMapping;
  t: TranslateFunction;
}

const SampleTable = ({ csvPreview, columnMapping, t }: SampleTableProps) => {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium mb-2">
        {t('import.sampleData', { count: csvPreview.totalRows })}
      </p>
      <div className="overflow-auto border rounded-md text-xs max-h-48">
        <table className="w-full">
          <thead className="bg-muted sticky top-0">
            <tr>
              {csvPreview.headers.map((header, index) => (
                <th
                  key={`th-${index}`}
                  className="px-2 py-1 text-left font-medium whitespace-nowrap"
                >
                  {shortColumnLabel(header, index, t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {csvPreview.sampleRows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-t">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className={cn(
                      'px-2 py-1 truncate max-w-[120px]',
                      isMappedColumn(cellIndex, columnMapping) &&
                        'bg-primary/10',
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const parseCategoryColumnValue = (v: string): number | null => {
  if (v === NO_COLUMN) {
    return null;
  }

  return parseInt(v);
};

const columnLabel = (
  header: string,
  idx: number,
  t: TranslateFunction,
): string => {
  if (header) return header;

  return t('import.columnN', { n: idx + 1 });
};

const shortColumnLabel = (
  header: string,
  idx: number,
  t: TranslateFunction,
): string => {
  if (header) return header;

  return t('import.colN', { n: idx + 1 });
};

const isMappedColumn = (cellIdx: number, mapping: ColumnMapping): boolean => {
  if (cellIdx === mapping.dateColumn) return true;
  if (cellIdx === mapping.descriptionColumn) return true;
  if (cellIdx === mapping.amountColumn) return true;
  if (cellIdx === mapping.categoryColumn) return true;

  return false;
};
