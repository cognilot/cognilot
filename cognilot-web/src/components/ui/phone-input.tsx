import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/*
  Formats phone numbers as +51 999 999 999
  Assumes simple formatting for now based on user request.
  Ideal logic: +{countryCode} {rest}
*/

interface PhoneInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const format = (val: string) => {
      if (!val) return '';
      // Remove all non-numeric chars except + at start
      const clean = val.replace(/[^\d+]/g, '');

      // If no +, assume it's just numbers, maybe add +51 if lengthy enough?
      // For now, let's just format groups of 3 after the first few chars
      // Simple approach: +XX XXX XXX XXX

      // If empty, return
      if (clean.length === 0) return '';

      // Basic formatter: +XX XXX XXX XXX
      // This is a naive implementation; specialized libraries exist for robust handling.
      // User asked for visual: +51 933 524 449

      // If starts with +, keep it. Else add +51?
      // Let's assume user types numbers and we format.

      // Check if user is typing +
      const hasPlus = clean.startsWith('+');
      let numbers = clean.replace(/\+/g, '');

      if (numbers.length > 2) {
        // +51 9...
        let formatted = hasPlus ? '+' : '';
        // formatted += numbers.substring(0, 2) + " ";
        // Actually, let's just insert spaces every 3 chars for readability after country code
        // But country codes vary in length. Hardcoding +51 for now as per example?
        // Or just standard chunking for local numbers 933 524 449

        // Let's implement a dynamic formatter that chunks by 3 for readability
        // +51 933 524 449 -> +51 (2 chars), then 3, 3, 3

        // formatted = + + numbers(0,2) + " " + numbers(2,5) + " " ...

        // Let's allow user to type freely but add spacing
        // Grouping logic:
        // If starts with 51 (Peru), format as +51 XXX XXX XXX

        if (numbers.startsWith('51')) {
          formatted += '+51';
          numbers = numbers.substring(2);
          if (numbers.length > 0) formatted += ' ' + numbers.substring(0, 3);
          if (numbers.length > 3) formatted += ' ' + numbers.substring(3, 6);
          if (numbers.length > 6) formatted += ' ' + numbers.substring(6, 9);
          return formatted.trim();
        } else {
          // Generic grouping
          const chunks = numbers.match(/.{1,3}/g);
          return (hasPlus ? '+' : '') + (chunks ? chunks.join(' ') : numbers);
        }
      }

      return clean;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Remove spaces to store raw/clean value if needed, but input value is display value
      // User probably wants to see formatted value while typing
      const formatted = format(raw);
      onChange(formatted);
    };

    return (
      <Input
        ref={ref}
        className={cn('font-mono', className)}
        {...props}
        value={value}
        onChange={handleChange}
        maxLength={15} // logical limit
        inputMode="tel"
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
