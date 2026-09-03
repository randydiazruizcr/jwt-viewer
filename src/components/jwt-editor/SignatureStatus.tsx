'use client';

import { CircleAlert, CircleCheck, CircleHelp, CircleX, Clock } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/cn';
import type { VerificationState } from '@/lib/jwt/types';

type Presentation = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    className: string;
};

/**
 * `expired` tiene su propio color y su propia palabra: un token vencido está bien firmado, y
 * confundirlo con una firma que no cuadra manda a buscar el problema al lugar equivocado.
 */
const PRESENTATION: Record<VerificationState['status'], Presentation> = {
    idle: {
        label: 'Sin verificar',
        icon: CircleHelp,
        className: 'border-line-strong bg-sunk text-ink-mid',
    },
    valid: {
        label: 'Firma válida',
        icon: CircleCheck,
        className: 'border-ok/40 bg-ok-wash text-ok',
    },
    invalid: {
        label: 'Firma inválida',
        icon: CircleX,
        className: 'border-danger/40 bg-danger-wash text-danger',
    },
    expired: {
        label: 'Token vencido',
        icon: Clock,
        className: 'border-warn/40 bg-warn-wash text-warn',
    },
    error: {
        label: 'No se pudo verificar',
        icon: CircleAlert,
        className: 'border-warn/40 bg-warn-wash text-warn',
    },
};

/** Los dos estados sin `message` propio necesitan igual una segunda línea que diga algo. */
const DEFAULT_DETAIL: Record<'idle' | 'valid', string> = {
    idle: 'Cargá el secreto o la clave pública para comprobar la firma.',
    valid: 'La firma coincide con la clave indicada y las fechas están vigentes.',
};

export function SignatureStatus({
    verification,
    className,
}: {
    verification: VerificationState;
    /** Lo aporta quien lo coloca: el estado no decide cuánto espacio ocupa en la fila. */
    className?: string;
}) {
    const { label, icon: Icon, className: toneClassName } = PRESENTATION[verification.status];
    const detail =
        'message' in verification ? verification.message : DEFAULT_DETAIL[verification.status];

    return (
        <div
            role="status"
            className={cn(
                'flex items-start gap-2.5 rounded-md border px-3 py-2.5',
                toneClassName,
                className
            )}
        >
            <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                <p className="mt-0.5 text-xs opacity-90">{detail}</p>
            </div>
        </div>
    );
}
