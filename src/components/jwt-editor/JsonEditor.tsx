'use client';

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

type JsonEditorProps = {
    label: string;
    value: string;
    error: string | null;
    placeholder: string;
    onChange: (value: string) => void;
};

/**
 * Editor de JSON en crudo. Es un textarea a propósito: el usuario tiene que poder pegar,
 * romper y arreglar el JSON a mano; un editor de árbol con campos tipados estorbaría para
 * exactamente lo que hace falta acá, que es ver y tocar los claims tal cual son.
 */
export function JsonEditor({ label, value, error, placeholder, onChange }: JsonEditorProps) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-label={label}
                aria-invalid={error !== null}
                placeholder={placeholder}
                className={cn(
                    'token-glyphs scrollbar-thin min-h-0 w-full flex-1 resize-none border-0 bg-transparent p-3',
                    'text-ink outline-none placeholder:text-ink-muted'
                )}
            />

            {error ? (
                <p
                    role="alert"
                    className="flex items-start gap-2 border-t border-danger/30 bg-danger-wash px-3 py-2 text-sm text-danger"
                >
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    JSON inválido: {error}
                </p>
            ) : null}
        </div>
    );
}
