'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './Button';

/** Copia al portapapeles y confirma en el mismo botón; un toast sería mucho aparato. */
export function CopyButton({ value, label }: { value: string; label: string }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const timer = setTimeout(() => setCopied(false), 1600);
        return () => clearTimeout(timer);
    }, [copied]);

    return (
        <Button
            disabled={value.length === 0}
            aria-label={label}
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value);
                    setCopied(true);
                } catch {
                    setCopied(false);
                }
            }}
            className="px-2 py-1 text-xs"
        >
            {copied ? (
                <Check aria-hidden className="size-3.5 text-ok" />
            ) : (
                <Copy aria-hidden className="size-3.5" />
            )}
            {copied ? 'Copiado' : 'Copiar'}
        </Button>
    );
}
