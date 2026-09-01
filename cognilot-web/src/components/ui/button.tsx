import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 shrink-0 outline-none',
  {
    variants: {
      variant: {
        solid:
          'font-sans font-medium px-5 py-2.5 bg-white hover:bg-white/90 text-black rounded-lg shadow-sm transition-all',
        terminal:
          'bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-lg border border-white/10 font-sans shadow-sm transition-all',
        variable:
          'font-sans text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors',
        ghost:
          'font-sans text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors',
        secondary:
          'font-sans bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors',
        destructive:
          'font-sans bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-[48px] px-6 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'terminal',
      size: 'md',
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
