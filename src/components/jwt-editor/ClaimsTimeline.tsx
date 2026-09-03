'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { timeClaims } from '@/lib/format/claims';
import type { JsonObject } from '@/lib/jwt/types';

const TICK_MS = 30_000;

function subscribe(onChange: () => void): () => void {
    const timer = setInterval(onChange, TICK_MS);
    return () => clearInterval(timer);
}

/** Última lectura del reloj, con el tramo de 30 s y el payload con los que se tomó. */
let sample: { tick: number; payload: JsonObject | null; now: number } = {
    tick: -1,
    payload: null,
    now: 0,
};

/**
 * El reloj es un sistema externo, no estado de React, y `useSyncExternalStore` es la vía
 * para leerlo: el render se queda puro.
 *
 * Devuelve la hora REAL del momento en que se tomó la lectura, no el borde del tramo.
 * Redondear hacia abajo haría que un `iat` de hace diez segundos se leyera como futuro
 * ("dentro de 20 segundos"). El tramo solo sirve para que dos llamadas seguidas den el mismo
 * número: si cambiara en cada llamada, React volvería a renderizar sin parar.
 *
 * Se vuelve a leer también cuando cambia el payload, y no solo cada 30 s: un token recién
 * firmado hay que compararlo contra la hora de AHORA. Contra la lectura del tramo en curso
 * —que puede tener 29 segundos— su propio `iat` cae en el futuro.
 */
function readClock(payload: JsonObject | null): number {
    const tick = Math.floor(Date.now() / TICK_MS);

    if (tick !== sample.tick || payload !== sample.payload) {
        sample = { tick, payload, now: Date.now() };
    }

    return sample.now;
}

/** En el servidor no hay reloj del usuario: sin hora, no se pinta nada y no hay desajuste. */
const getServerSnapshot = (): null => null;

export function ClaimsTimeline({ payload }: { payload: JsonObject | null }) {
    // La identidad del payload entra en la lectura: al cambiar, React vuelve a leer el reloj.
    const getSnapshot = useCallback(() => readClock(payload), [payload]);
    const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (now === null) return null;

    const claims = timeClaims(payload, now);
    if (claims.length === 0) return null;

    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-3 py-2">
            {claims.map((claim) => (
                <li key={claim.claim} className="flex items-baseline gap-1.5 text-xs">
                    <span className="font-mono text-ink-muted">{claim.claim}</span>
                    <span className="text-ink-mid">{claim.label}</span>
                    <span
                        title={claim.absolute}
                        className={cn('font-medium', claim.isPast ? 'text-danger' : 'text-ink')}
                    >
                        {claim.relative}
                    </span>
                </li>
            ))}
        </ul>
    );
}
