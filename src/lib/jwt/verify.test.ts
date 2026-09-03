import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { pemKeyMaterial } from '@/test/key-fixtures';
import { signToken } from './sign';
import { secretToBytes, type KeyMaterial } from './types';
import { verifyToken } from './verify';

const SECRET: KeyMaterial = { type: 'secret', secret: 'un-secreto-de-al-menos-256-bits!!' };

async function hs256Token(payload: Record<string, unknown>): Promise<string> {
    if (SECRET.type !== 'secret') throw new Error('fixture inválido');

    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .sign(secretToBytes(SECRET.secret));
}

describe('verifyToken · HS256', () => {
    it('acepta un token firmado con el mismo secreto', async () => {
        const token = await hs256Token({ sub: 'user_1' });

        await expect(verifyToken(token, 'HS256', SECRET)).resolves.toEqual({ status: 'valid' });
    });

    it('rechaza un token firmado con otro secreto', async () => {
        const token = await hs256Token({ sub: 'user_1' });

        const result = await verifyToken(token, 'HS256', {
            type: 'secret',
            secret: 'otro-secreto',
        });

        expect(result).toMatchObject({ status: 'invalid' });
        expect(result).toHaveProperty('message', expect.stringContaining('firma'));
    });

    it('distingue un token vencido de una firma inválida', async () => {
        const expirado = Math.floor(Date.now() / 1000) - 60;
        const token = await hs256Token({ sub: 'user_1', exp: expirado });

        const result = await verifyToken(token, 'HS256', SECRET);

        expect(result).toMatchObject({ status: 'expired' });
    });

    it('avisa cuando el header del token declara otro algoritmo', async () => {
        const token = await hs256Token({ sub: 'user_1' });

        const result = await verifyToken(token, 'HS384', SECRET);

        expect(result).toMatchObject({ status: 'invalid' });
    });

    it('avisa cuando se le pasa material PEM a un algoritmo HS*', async () => {
        const token = await hs256Token({ sub: 'user_1' });
        const pem = await pemKeyMaterial('RS256');

        const result = await verifyToken(token, 'HS256', pem);

        expect(result).toMatchObject({ status: 'error' });
    });

    it('reporta un token mal formado como error, no como firma inválida', async () => {
        const result = await verifyToken('esto.no.es-un-jwt', 'HS256', SECRET);

        expect(result.status).toBe('error');
    });
});

describe.each(['RS256', 'ES256', 'PS256'] as const)('verifyToken · %s', (algorithm) => {
    it('acepta un token firmado con la privada del mismo par', async () => {
        const keys = await pemKeyMaterial(algorithm);
        const signed = await signToken({ typ: 'JWT' }, { sub: 'user_1' }, algorithm, keys);

        if (!signed.ok) throw new Error(signed.message);

        await expect(verifyToken(signed.token, algorithm, keys)).resolves.toEqual({
            status: 'valid',
        });
    });

    it('rechaza el token contra la pública de otro par', async () => {
        const keys = await pemKeyMaterial(algorithm);
        const otras = await pemKeyMaterial(algorithm);
        const signed = await signToken({ typ: 'JWT' }, { sub: 'user_1' }, algorithm, keys);

        if (!signed.ok) throw new Error(signed.message);

        const result = await verifyToken(signed.token, algorithm, otras);

        expect(result).toMatchObject({ status: 'invalid' });
    });

    it('avisa cuando se le pasa un secreto en vez de una clave PEM', async () => {
        const keys = await pemKeyMaterial(algorithm);
        const signed = await signToken({ typ: 'JWT' }, { sub: 'user_1' }, algorithm, keys);

        if (!signed.ok) throw new Error(signed.message);

        const result = await verifyToken(signed.token, algorithm, SECRET);

        expect(result).toMatchObject({ status: 'error' });
    });
});
