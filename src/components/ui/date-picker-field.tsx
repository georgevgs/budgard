import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
  locale?: Locale;
  disabled?: ((date: Date) => boolean) | boolean;
  className?: string;
};

export const DatePickerField = ({
  value,
  onChange,
  placeholder,
  locale,
  disabled,
  className,
}: Props) => {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {renderLabel(value, placeholder, locale)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={locale}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
};

// --- Helpers ---

const renderLabel = (
  value: Date | undefined,
  placeholder: string,
  locale: Locale | undefined,
) => {
  if (!value) {
    return placeholder;
  }

  return format(value, 'PPP', { locale });
};
