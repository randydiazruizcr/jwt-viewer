// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SignatureStatus } from './SignatureStatus';

describe('SignatureStatus', () => {
    it('sin clave no acusa un fallo: dice que no se verificó', () => {
        render(<SignatureStatus verification={{ status: 'idle' }} />);

        expect(screen.getByText('Sin verificar')).toBeInTheDocument();
        expect(screen.getByText(/Cargá el secreto/)).toBeInTheDocument();
    });

    it('una firma válida se explica sin dejar el texto de "sin verificar"', () => {
        render(<SignatureStatus verification={{ status: 'valid' }} />);

        expect(screen.getByText('Firma válida')).toBeInTheDocument();
        expect(screen.queryByText(/Cargá el secreto/)).not.toBeInTheDocument();
    });

    it('un token vencido no se anuncia como firma inválida', () => {
        render(<SignatureStatus verification={{ status: 'expired', message: 'venció' }} />);

        expect(screen.getByText('Token vencido')).toBeInTheDocument();
        expect(screen.queryByText('Firma inválida')).not.toBeInTheDocument();
    });

    it('muestra el motivo cuando la firma no coincide', () => {
        render(
            <SignatureStatus
                verification={{ status: 'invalid', message: 'La firma no coincide.' }}
            />
        );

        expect(screen.getByText('Firma inválida')).toBeInTheDocument();
        expect(screen.getByText('La firma no coincide.')).toBeInTheDocument();
    });

    it('distingue "no se pudo verificar" de "firma inválida"', () => {
        render(<SignatureStatus verification={{ status: 'error', message: 'clave rota' }} />);

        expect(screen.getByText('No se pudo verificar')).toBeInTheDocument();
    });
});
