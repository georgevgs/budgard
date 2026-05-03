import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn, formatCurrencyInput } from '@/lib/utils';
import { getCurrencySymbol } from '@/lib/currencies';

type Props = Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> & {
  currency: string;
  value: string;
  onChange: (formatted: string) => void;
  wrapperClassName?: string;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ currency, value, onChange, className, wrapperClassName, ...rest }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(formatCurrencyInput(event.target.value));
    };

    return (
      <div className={cn('relative', wrapperClassName)}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {getCurrencySymbol(currency)}
        </span>
        <Input
          {...rest}
          ref={ref}
          type="text"
          inputMode="decimal"
          pattern="[0-9,.]*"
          value={value}
          onChange={handleChange}
          className={cn('pl-7', className)}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
