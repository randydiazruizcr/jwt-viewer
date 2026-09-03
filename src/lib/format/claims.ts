import type { JsonObject } from '@/lib/jwt/types';

export type TimeClaim = {
    claim: 'iat' | 'nbf' | 'exp';
    label: string;
    /** Fecha legible en la zona horaria del navegador. */
    absolute: string;
    /** "hace 3 minutos" / "en 2 horas". */
    relative: string;
    /** Solo `exp` puede estar vencido; se usa para pintarlo en rojo. */
    isPast: boolean;
};

const LABELS: Record<TimeClaim['claim'], string> = {
    iat: 'Emitido',
    nbf: 'Válido desde',
    exp: 'Vence',
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
];

function relativeFromSeconds(deltaSeconds: number): string {
    const formatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    const absolute = Math.abs(deltaSeconds);

    for (const [unit, size] of UNITS) {
        if (absolute >= size) {
            return formatter.format(Math.round(deltaSeconds / size), unit);
        }
    }

    return formatter.format(0, 'second');
}

/**
 * Los claims de tiempo son segundos desde epoch: un número de diez dígitos que nadie lee de
 * un vistazo. Traducirlos es la diferencia entre ver `1767225600` y ver que el token venció
 * hace veinte minutos, que suele ser justo lo que se está buscando.
 */
export function timeClaims(payload: JsonObject | null, now: number = Date.now()): TimeClaim[] {
    if (!payload) return [];

    const nowSeconds = Math.floor(now / 1000);

    return (['iat', 'nbf', 'exp'] as const).flatMap((claim) => {
        const value = payload[claim];
        if (typeof value !== 'number' || !Number.isFinite(value)) return [];

        const date = new Date(value * 1000);
        if (Number.isNaN(date.getTime())) return [];

        return [
            {
                claim,
                label: LABELS[claim],
                absolute: date.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }),
                relative: relativeFromSeconds(value - nowSeconds),
                isPast: claim === 'exp' && value < nowSeconds,
            },
        ];
    });
}
