import * as React from 'react';
import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import CalendarIcon from 'lucide-react/dist/esm/icons/calendar';
import { Button } from '@/common/ui/button';
import { Calendar } from '@/common/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/common/ui/popover';
import { cn } from '@/constants/utils';

type Props = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder: string;
  locale?: Locale;
  disabled?: ((date: Date) => boolean) | boolean;
  className?: string;
  // What `FormControl` injects when this sits inside one — a plain `<Input>`
  // gets these for free by being a real form element; the trigger here is a
  // `<button>`, so they have to be threaded through by hand.
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

export const DatePickerField = React.forwardRef<HTMLButtonElement, Props>(
  (
    { value, onChange, placeholder, locale, disabled, className, id, ...aria },
    ref,
  ) => {
    return (
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            ref={ref}
            id={id}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
            {...aria}
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
  },
);
DatePickerField.displayName = 'DatePickerField';

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
