import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none',
  {
    variants: {
      variant: {
        variable: 'font-mono text-white/60 hover:text-white',
        solid:
          'font-sans font-medium px-5 py-2.5 bg-white hover:bg-gray-200 text-black rounded-md shadow-sm',
        terminal:
          'bg-white/5 hover:bg-white/10 text-white rounded border border-white/10 font-mono shadow-sm',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-xs',
        lg: 'h-[52px] px-8 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'terminal',
      size: 'lg',
    },
  }
);

function Button({
  className,
  variant = 'terminal',
  size = 'lg',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
