import { describe, expect, it } from 'vitest';
import { decodeToken } from './decode';

/** base64url de un objeto, sin firmar: sirve para armar tokens de prueba a mano. */
function segment(value: unknown): string {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function tokenFrom(header: unknown, payload: unknown, signature = 'firma-no-verificada'): string {
    return `${segment(header)}.${segment(payload)}.${signature}`;
}

describe('decodeToken', () => {
    it('decodifica header y payload y deja la firma cruda', () => {
        const raw = tokenFrom({ alg: 'HS256', typ: 'JWT' }, { sub: 'user_1', admin: true });

        const result = decodeToken(raw);

        expect(result).toEqual({
            ok: true,
            value: {
                header: { alg: 'HS256', typ: 'JWT' },
                payload: { sub: 'user_1', admin: true },
                signature: 'firma-no-verificada',
            },
        });
    });

    it('ignora espacios alrededor del token', () => {
        const raw = `  ${tokenFrom({ alg: 'HS256' }, { sub: 'x' })}\n`;

        const result = decodeToken(raw);

        expect(result.ok).toBe(true);
    });

    it('rechaza un token que no tiene tres segmentos', () => {
        const result = decodeToken('solo.dos');

        expect(result).toMatchObject({ ok: false, error: { code: 'malformed_structure' } });
    });

    it('rechaza un token con un segmento vacío', () => {
        const result = decodeToken(`${segment({ alg: 'HS256' })}..firma`);

        expect(result).toMatchObject({ ok: false, error: { code: 'malformed_structure' } });
    });

    it('señala cuál segmento no es JSON válido', () => {
        const raw = `${segment({ alg: 'HS256' })}.${Buffer.from('{roto', 'utf8').toString('base64url')}.firma`;

        const result = decodeToken(raw);

        expect(result).toMatchObject({
            ok: false,
            error: { code: 'invalid_json', part: 'payload' },
        });
    });

    it('rechaza un segmento que decodifica a algo que no es objeto', () => {
        const raw = tokenFrom({ alg: 'HS256' }, ['no', 'es', 'objeto']);

        const result = decodeToken(raw);

        expect(result).toMatchObject({
            ok: false,
            error: { code: 'invalid_json', part: 'payload' },
        });
    });

    it('rechaza base64url inválido en el header', () => {
        const result = decodeToken('###.###.firma');

        expect(result).toMatchObject({ ok: false, error: { part: 'header' } });
    });
});
