// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useJwtStore } from '@/store/jwt-store';
import { KeyInput } from './KeyInput';

beforeEach(() => {
    useJwtStore.getState().reset();
});

describe('KeyInput', () => {
    it('con HS* pide un único secreto compartido', () => {
        render(<KeyInput />);

        expect(screen.getByLabelText('Secreto compartido')).toBeInTheDocument();
        expect(screen.queryByLabelText('Clave privada')).not.toBeInTheDocument();
    });

    it('escribir el secreto lo guarda en el store', async () => {
        const user = userEvent.setup();
        render(<KeyInput />);

        await user.type(screen.getByLabelText('Secreto compartido'), 'abc');

        expect(useJwtStore.getState().keyMaterial).toEqual({ type: 'secret', secret: 'abc' });
    });

    it('con RS* cambia de forma y pide el par de claves', () => {
        useJwtStore.getState().setAlgorithm('RS256');
        render(<KeyInput />);

        expect(screen.getByLabelText('Clave pública')).toBeInTheDocument();
        expect(screen.getByLabelText('Clave privada')).toBeInTheDocument();
        expect(screen.queryByLabelText('Secreto compartido')).not.toBeInTheDocument();
    });

    it('marca un PEM que no tiene el formato que Web Crypto sabe importar', async () => {
        const user = userEvent.setup();
        useJwtStore.getState().setAlgorithm('ES256');
        render(<KeyInput />);

        await user.type(screen.getByLabelText('Clave pública'), 'no soy una clave');

        expect(await screen.findByRole('alert')).toHaveTextContent('SPKI');
    });

    it('un campo vacío todavía no es un error', () => {
        useJwtStore.getState().setAlgorithm('ES256');
        render(<KeyInput />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
