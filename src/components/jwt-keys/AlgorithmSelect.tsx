'use client';

import { ChevronDown } from 'lucide-react';
import { JWS_ALGORITHMS, isJwsAlgorithm } from '@/lib/jwt/types';
import { useJwtStore } from '@/store/jwt-store';

export function AlgorithmSelect() {
    const algorithm = useJwtStore((state) => state.algorithm);
    const setAlgorithm = useJwtStore((state) => state.setAlgorithm);

    return (
        <div className="relative">
            <label htmlFor="algorithm" className="sr-only">
                Algoritmo de firma
            </label>
            <select
                id="algorithm"
                value={algorithm}
                onChange={(event) => {
                    const next = event.target.value;
                    if (isJwsAlgorithm(next)) setAlgorithm(next);
                }}
                className="appearance-none rounded-md border border-line bg-sunk py-1.5 pr-8 pl-3 font-mono text-sm text-ink transition hover:border-line-strong"
            >
                {JWS_ALGORITHMS.map((value) => (
                    <option key={value} value={value}>
                        {value}
                    </option>
                ))}
            </select>
            <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
            />
        </div>
    );
}
