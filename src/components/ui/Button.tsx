'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
};

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-accent text-accent-ink hover:brightness-110 disabled:bg-line disabled:text-ink-muted',
    ghost: 'border border-line text-ink-mid hover:border-line-strong hover:text-ink disabled:text-ink-muted',
};

export function Button({ variant = 'ghost', className, ...props }: ButtonProps) {
    return (
        <button
            type="button"
            className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
                'disabled:cursor-not-allowed disabled:opacity-70',
                VARIANTS[variant],
                className
            )}
            {...props}
        />
    );
}
