import { describe, expect, it } from 'vitest';
import { pemKeyMaterial } from '@/test/key-fixtures';
import { decodeToken } from './decode';
import { signToken } from './sign';
import type { KeyMaterial } from './types';
import { verifyToken } from './verify';

const SECRET: KeyMaterial = { type: 'secret', secret: 'un-secreto-de-al-menos-256-bits!!' };

describe('signToken', () => {
    it('firma con HS256 y el resultado se verifica con el mismo secreto', async () => {
        const signed = await signToken({ typ: 'JWT' }, { sub: 'user_1' }, 'HS256', SECRET);

        expect(signed.ok).toBe(true);
        if (!signed.ok) return;

        await expect(verifyToken(signed.token, 'HS256', SECRET)).resolves.toEqual({
            status: 'valid',
        });
    });

    it('escribe en el header el algoritmo con el que realmente firmó', async () => {
        const signed = await signToken({ alg: 'RS256', typ: 'JWT' }, {}, 'HS512', SECRET);

        expect(signed.ok).toBe(true);
        if (!signed.ok) return;

        const decoded = decodeToken(signed.token);

        expect(decoded.ok).toBe(true);
        if (!decoded.ok) return;
        expect(decoded.value.header).toMatchObject({ alg: 'HS512', typ: 'JWT' });
    });

    it('no agrega claims por su cuenta: firma exactamente el payload dado', async () => {
        const signed = await signToken({}, { sub: 'user_1' }, 'HS256', SECRET);

        expect(signed.ok).toBe(true);
        if (!signed.ok) return;

        const decoded = decodeToken(signed.token);

        expect(decoded.ok).toBe(true);
        if (!decoded.ok) return;
        expect(decoded.value.payload).toEqual({ sub: 'user_1' });
    });

    it('conserva los claims personalizados del header', async () => {
        const signed = await signToken({ kid: 'clave-2026', typ: 'JWT' }, {}, 'HS256', SECRET);

        expect(signed.ok).toBe(true);
        if (!signed.ok) return;

        const decoded = decodeToken(signed.token);

        expect(decoded.ok).toBe(true);
        if (!decoded.ok) return;
        expect(decoded.value.header).toMatchObject({ kid: 'clave-2026' });
    });

    it('firma con RS256 usando la clave privada PKCS#8', async () => {
        const keys = await pemKeyMaterial('RS256');

        const signed = await signToken({ typ: 'JWT' }, { sub: 'user_1' }, 'RS256', keys);

        expect(signed.ok).toBe(true);
        if (!signed.ok) return;
        await expect(verifyToken(signed.token, 'RS256', keys)).resolves.toEqual({
            status: 'valid',
        });
    });

    it('falla con mensaje cuando el material de clave no corresponde al algoritmo', async () => {
        const signed = await signToken({}, {}, 'RS256', SECRET);

        expect(signed).toMatchObject({ ok: false });
        expect(signed).toHaveProperty('message', expect.stringContaining('RS256'));
    });

    it('falla con mensaje cuando la clave privada es basura', async () => {
        const signed = await signToken({}, {}, 'ES256', {
            type: 'pem',
            publicKey: '',
            privateKey: '-----BEGIN PRIVATE KEY-----\nno-es-una-clave\n-----END PRIVATE KEY-----',
        });

        expect(signed.ok).toBe(false);
    });
});
