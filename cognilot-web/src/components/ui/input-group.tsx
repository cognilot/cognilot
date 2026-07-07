import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('flex w-full items-center', className)} {...props} />;
  }
);
InputGroup.displayName = 'InputGroup';

const InputGroupAddon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center border border-input bg-muted px-3 text-sm text-muted-foreground first:rounded-l-md first:border-r-0 last:rounded-r-md last:border-l-0',
          className
        )}
        {...props}
      />
    );
  }
);
InputGroupAddon.displayName = 'InputGroupAddon';

const InputGroupText = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    return <span ref={ref} className={cn('text-sm', className)} {...props} />;
  }
);
InputGroupText.displayName = 'InputGroupText';

// Extended Input for Group usage (removes borders/radius where needed)
const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
  ({ className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          'first:rounded-l-md last:rounded-r-md first:rounded-r-none last:rounded-l-none focus-visible:z-10',
          className
        )}
        {...props}
      />
    );
  }
);
InputGroupInput.displayName = 'InputGroupInput';

export { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput };
