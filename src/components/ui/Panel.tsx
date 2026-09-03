'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PanelProps = {
    title: string;
    /** Color del filete superior: es lo que ata el panel con su segmento del token. */
    accentClassName?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function Panel({ title, accentClassName, actions, children, className }: PanelProps) {
    return (
        <section
            className={cn(
                'flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-panel',
                className
            )}
        >
            <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-ink-mid uppercase">
                    {accentClassName ? (
                        <span
                            aria-hidden
                            className={cn('h-2.5 w-2.5 rounded-full', accentClassName)}
                        />
                    ) : null}
                    {title}
                </h2>
                {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
            </header>
            <div className="min-h-0 flex-1">{children}</div>
        </section>
    );
}
