import { describe, expect, it } from 'vitest';
import {
    emptyKeyMaterial,
    hasSigningKey,
    hasVerificationKey,
    validatePrivateKeyPem,
    validatePublicKeyPem,
} from './keys';

const SPKI = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBg\n-----END PUBLIC KEY-----';
const PKCS8 = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN\n-----END PRIVATE KEY-----';

describe('validatePublicKeyPem', () => {
    it('acepta SPKI', () => {
        expect(validatePublicKeyPem(SPKI)).toBeNull();
    });

    it('acepta el campo vacío: todavía no es un error, solo falta', () => {
        expect(validatePublicKeyPem('   ')).toBeNull();
    });

    it('explica cómo convertir PKCS#1, que Web Crypto no importa', () => {
        const message = validatePublicKeyPem('-----BEGIN RSA PUBLIC KEY-----\nMIIB\n-----END');

        expect(message).toContain('PKCS#1');
    });

    it('rechaza cualquier otra cosa', () => {
        expect(validatePublicKeyPem('no soy una clave')).toContain('SPKI');
    });
});

describe('validatePrivateKeyPem', () => {
    it('acepta PKCS#8', () => {
        expect(validatePrivateKeyPem(PKCS8)).toBeNull();
    });

    it('explica cómo convertir una clave heredada RSA/EC', () => {
        const message = validatePrivateKeyPem('-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END');

        expect(message).toContain('pkcs8');
    });
});

describe('hasVerificationKey / hasSigningKey', () => {
    it('HS* solo necesita un secreto no vacío', () => {
        expect(hasVerificationKey('HS256', { type: 'secret', secret: 'abc' })).toBe(true);
        expect(hasSigningKey('HS256', { type: 'secret', secret: '' })).toBe(false);
    });

    it('HS* con material PEM no sirve', () => {
        expect(
            hasVerificationKey('HS256', { type: 'pem', publicKey: SPKI, privateKey: PKCS8 })
        ).toBe(false);
    });

    it('verificar RS256 necesita la pública; firmar necesita la privada', () => {
        const soloPublica = { type: 'pem', publicKey: SPKI, privateKey: '' } as const;

        expect(hasVerificationKey('RS256', soloPublica)).toBe(true);
        expect(hasSigningKey('RS256', soloPublica)).toBe(false);
    });

    it('una clave con formato inválido cuenta como ausente', () => {
        const rota = { type: 'pem', publicKey: 'basura', privateKey: 'basura' } as const;

        expect(hasVerificationKey('ES256', rota)).toBe(false);
        expect(hasSigningKey('ES256', rota)).toBe(false);
    });
});

describe('emptyKeyMaterial', () => {
    it('da la forma que pide cada familia de algoritmo', () => {
        expect(emptyKeyMaterial('HS384')).toEqual({ type: 'secret', secret: '' });
        expect(emptyKeyMaterial('PS512')).toEqual({ type: 'pem', publicKey: '', privateKey: '' });
    });
});
