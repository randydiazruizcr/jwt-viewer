import type { JwsAlgorithm, KeyMaterial } from './types';
import { keyTypeFor } from './types';

const SPKI_PUBLIC = /-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----/;
const PKCS8_PRIVATE = /-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/;
/** PKCS#1 y SEC1: formatos legítimos que Web Crypto no importa. Merecen su propio mensaje. */
const PKCS1_PUBLIC = /-----BEGIN RSA PUBLIC KEY-----/;
const LEGACY_PRIVATE = /-----BEGIN (RSA|EC) PRIVATE KEY-----/;

/** `null` = válido. Devuelve el motivo cuando no lo es, para pintarlo bajo el campo. */
export function validatePublicKeyPem(pem: string): string | null {
    if (pem.trim().length === 0) return null;

    if (PKCS1_PUBLIC.test(pem)) {
        return 'Formato PKCS#1. Convertilo a SPKI: openssl rsa -RSAPublicKey_in -in clave.pem -pubout';
    }

    return SPKI_PUBLIC.test(pem)
        ? null
        : 'Se espera una clave pública en formato PEM/SPKI (-----BEGIN PUBLIC KEY-----).';
}

/** `null` = válida. Mismo criterio que la pública, pero en PKCS#8. */
export function validatePrivateKeyPem(pem: string): string | null {
    if (pem.trim().length === 0) return null;

    if (LEGACY_PRIVATE.test(pem)) {
        return 'Formato heredado. Convertilo a PKCS#8: openssl pkcs8 -topk8 -nocrypt -in clave.pem';
    }

    return PKCS8_PRIVATE.test(pem)
        ? null
        : 'Se espera una clave privada en formato PEM/PKCS#8 (-----BEGIN PRIVATE KEY-----).';
}

/** Verificar solo necesita el secreto (HS*) o la clave pública (el resto). */
export function hasVerificationKey(algorithm: JwsAlgorithm, keyMaterial: KeyMaterial): boolean {
    if (keyTypeFor(algorithm) === 'secret') {
        return keyMaterial.type === 'secret' && keyMaterial.secret.length > 0;
    }

    return (
        keyMaterial.type === 'pem' &&
        keyMaterial.publicKey.trim().length > 0 &&
        validatePublicKeyPem(keyMaterial.publicKey) === null
    );
}

/** Firmar necesita el secreto (HS*) o la clave privada (el resto). */
export function hasSigningKey(algorithm: JwsAlgorithm, keyMaterial: KeyMaterial): boolean {
    if (keyTypeFor(algorithm) === 'secret') {
        return keyMaterial.type === 'secret' && keyMaterial.secret.length > 0;
    }

    return (
        keyMaterial.type === 'pem' &&
        keyMaterial.privateKey.trim().length > 0 &&
        validatePrivateKeyPem(keyMaterial.privateKey) === null
    );
}

/** Material vacío del tipo que pide el algoritmo, para cuando se cambia de familia. */
export function emptyKeyMaterial(algorithm: JwsAlgorithm): KeyMaterial {
    return keyTypeFor(algorithm) === 'secret'
        ? { type: 'secret', secret: '' }
        : { type: 'pem', publicKey: '', privateKey: '' };
}
