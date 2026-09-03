// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { secretToBytes } from '@/lib/jwt/types';
import { useJwtStore } from '@/store/jwt-store';
import { TokenInput } from './TokenInput';

async function hs256Token(): Promise<string> {
    return new SignJWT({ sub: 'user_1' })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .sign(secretToBytes('secreto-de-prueba'));
}

beforeEach(() => {
    useJwtStore.getState().reset();
});

describe('TokenInput', () => {
    it('decodifica lo que se pega sin que haya que apretar nada', async () => {
        const user = userEvent.setup();
        const token = await hs256Token();
        render(<TokenInput />);

        await user.click(screen.getByLabelText('Token JWT'));
        await user.paste(token);

        await waitFor(() => {
            expect(useJwtStore.getState().payload).toEqual({ sub: 'user_1' });
        });
    });

    it('explica en el mismo panel por qué un token no sirve', async () => {
        const user = userEvent.setup();
        render(<TokenInput />);

        await user.click(screen.getByLabelText('Token JWT'));
        await user.paste('esto-no-es-un-jwt');

        expect(await screen.findByRole('alert')).toHaveTextContent('tres segmentos');
    });

    it('refleja un token que llegó desde afuera, como el que se acaba de firmar', async () => {
        const token = await hs256Token();
        render(<TokenInput />);

        useJwtStore.getState().setRawToken(token);

        await waitFor(() => {
            expect(screen.getByLabelText('Token JWT')).toHaveValue(token);
        });
    });

    it('pinta cada segmento del token con su color', async () => {
        const token = await hs256Token();
        const { container } = render(<TokenInput />);

        useJwtStore.getState().setRawToken(token);

        await waitFor(() => {
            expect(container.querySelector('.text-seg-header')).not.toBeNull();
        });
        expect(container.querySelector('.text-seg-payload')).not.toBeNull();
        expect(container.querySelector('.text-seg-signature')).not.toBeNull();
    });
});
