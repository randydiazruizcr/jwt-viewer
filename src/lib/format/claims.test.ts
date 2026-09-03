import { describe, expect, it } from 'vitest';
import { timeClaims } from './claims';

const NOW = Date.UTC(2026, 8, 3, 12, 0, 0);
const nowSeconds = Math.floor(NOW / 1000);

describe('timeClaims', () => {
    it('devuelve vacío cuando no hay payload', () => {
        expect(timeClaims(null, NOW)).toEqual([]);
    });

    it('ignora claims de tiempo ausentes', () => {
        expect(timeClaims({ sub: 'user_1' }, NOW)).toEqual([]);
    });

    it('ignora un claim de tiempo que no sea número', () => {
        expect(timeClaims({ exp: '1767225600' }, NOW)).toEqual([]);
    });

    it('traduce iat, nbf y exp en ese orden', () => {
        const claims = timeClaims(
            { exp: nowSeconds + 3600, iat: nowSeconds, nbf: nowSeconds },
            NOW
        );

        expect(claims.map((claim) => claim.claim)).toEqual(['iat', 'nbf', 'exp']);
    });

    it('marca vencido solo un exp en el pasado', () => {
        const vencido = timeClaims({ exp: nowSeconds - 60 }, NOW);
        const vigente = timeClaims({ exp: nowSeconds + 60 }, NOW);

        expect(vencido[0]?.isPast).toBe(true);
        expect(vigente[0]?.isPast).toBe(false);
    });

    it('un iat viejo no cuenta como vencido: es normal que esté en el pasado', () => {
        const claims = timeClaims({ iat: nowSeconds - 86_400 }, NOW);

        expect(claims[0]?.isPast).toBe(false);
    });

    it('describe la distancia en la unidad más grande que aplica', () => {
        const claims = timeClaims({ exp: nowSeconds + 7200 }, NOW);

        expect(claims[0]?.relative).toContain('hora');
    });
});
