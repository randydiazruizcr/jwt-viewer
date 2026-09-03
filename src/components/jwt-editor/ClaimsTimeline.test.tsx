// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimsTimeline } from './ClaimsTimeline';

/** Arranca un tramo de 30 s recién empezado, para que los saltos de tiempo caigan dentro. */
function tramoRecienEmpezado(): number {
    return Math.floor(Date.now() / 30_000) * 30_000 + 1_000;
}

const enSegundos = (ms: number) => Math.floor(ms / 1000);

describe('ClaimsTimeline', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('un token recién emitido no se lee como futuro', () => {
        const base = tramoRecienEmpezado();
        vi.setSystemTime(base);

        // Primera lectura del reloj: la pantalla ya está abierta con otro token.
        const { rerender } = render(<ClaimsTimeline payload={{ iat: enSegundos(base) }} />);

        // Pasan 25 s dentro del MISMO tramo de 30 s y recién ahí se firma el token.
        vi.setSystemTime(base + 25_000);
        rerender(<ClaimsTimeline payload={{ iat: enSegundos(base + 25_000) }} />);

        expect(screen.getByText('Emitido')).toBeInTheDocument();
        expect(screen.queryByText(/dentro de/)).not.toBeInTheDocument();
    });

    it('un `exp` por venir sí se anuncia como futuro', () => {
        const base = tramoRecienEmpezado();
        vi.setSystemTime(base);

        render(<ClaimsTimeline payload={{ exp: enSegundos(base) + 3600 }} />);

        expect(screen.getByText('Vence')).toBeInTheDocument();
        expect(screen.getByText(/dentro de/)).toBeInTheDocument();
    });

    it('sin claims de tiempo no pinta nada', () => {
        vi.setSystemTime(tramoRecienEmpezado());

        const { container } = render(<ClaimsTimeline payload={{ sub: 'user_1' }} />);

        expect(container).toBeEmptyDOMElement();
    });
});
