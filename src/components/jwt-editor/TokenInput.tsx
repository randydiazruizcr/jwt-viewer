'use client';

import { useEffect, useRef, useState, type UIEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useJwtStore } from '@/store/jwt-store';

/** Header, payload y firma, en ese orden. Un cuarto segmento ya no es un JWT: va en gris. */
const SEGMENT_CLASS = ['text-seg-header', 'text-seg-payload', 'text-seg-signature'] as const;

const FIELD_CLASS =
    'token-glyphs absolute inset-0 h-full w-full resize-none border-0 bg-transparent p-3 outline-none';

/**
 * El coloreado por segmento se hace con una capa de texto pintada DEBAJO de un textarea
 * transparente. Un textarea no admite marcado adentro, y un `contenteditable` traería sus
 * propios problemas (pegar con formato, deshacer roto, lectores de pantalla). Las dos capas
 * comparten la clase `token-glyphs` porque tienen que cortar las líneas en el mismo lugar.
 */
export function TokenInput() {
    const rawToken = useJwtStore((state) => state.rawToken);
    const tokenError = useJwtStore((state) => state.tokenError);
    const setRawToken = useJwtStore((state) => state.setRawToken);

    const [text, setText] = useState(rawToken);
    /** Último valor que este componente empujó al store, para no pelearse con él. */
    const pushedRef = useRef(rawToken);
    const highlightRef = useRef<HTMLPreElement>(null);

    // El token puede cambiar desde afuera (generar, cargar ejemplo, limpiar).
    useEffect(() => {
        if (rawToken !== pushedRef.current) {
            pushedRef.current = rawToken;
            setText(rawToken);
        }
    }, [rawToken]);

    // Decodifica al dejar de escribir: sin botón, pero sin decodificar en cada tecla tampoco.
    useEffect(() => {
        if (text === pushedRef.current) return;

        const timer = setTimeout(() => {
            pushedRef.current = text;
            setRawToken(text);
        }, 200);

        return () => clearTimeout(timer);
    }, [text, setRawToken]);

    const syncScroll = (event: UIEvent<HTMLTextAreaElement>) => {
        const layer = highlightRef.current;
        if (!layer) return;
        layer.scrollTop = event.currentTarget.scrollTop;
        layer.scrollLeft = event.currentTarget.scrollLeft;
    };

    const segments = text.split('.');

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="relative min-h-0 flex-1">
                <pre
                    ref={highlightRef}
                    aria-hidden
                    className={cn(FIELD_CLASS, 'overflow-hidden select-none')}
                >
                    {segments.map((segment, index) => (
                        <span key={index}>
                            {index > 0 ? <span className="text-ink-muted">.</span> : null}
                            <span className={SEGMENT_CLASS[index] ?? 'text-ink-muted'}>
                                {segment}
                            </span>
                        </span>
                    ))}
                    {'\n'}
                </pre>

                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onScroll={syncScroll}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Token JWT"
                    placeholder="Pegá acá un JSON Web Token…"
                    className={cn(
                        FIELD_CLASS,
                        'scrollbar-thin overflow-auto text-transparent caret-ink',
                        'placeholder:text-ink-muted'
                    )}
                />
            </div>

            {tokenError ? (
                <p
                    role="alert"
                    className="flex items-start gap-2 border-t border-danger/30 bg-danger-wash px-3 py-2 text-sm text-danger"
                >
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {tokenError}
                </p>
            ) : null}
        </div>
    );
}
