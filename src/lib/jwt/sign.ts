import { SignJWT, importPKCS8 } from 'jose';
import type { JsonObject, JwsAlgorithm, KeyMaterial, SignResult } from './types';
import { keyTypeFor, secretToBytes } from './types';

async function resolveSigningKey(
    algorithm: JwsAlgorithm,
    keyMaterial: KeyMaterial
): Promise<Uint8Array | CryptoKey> {
    if (keyTypeFor(algorithm) === 'secret') {
        if (keyMaterial.type !== 'secret') {
            throw new Error(`${algorithm} usa un secreto compartido, no una clave PEM.`);
        }
        return secretToBytes(keyMaterial.secret);
    }

    if (keyMaterial.type !== 'pem') {
        throw new Error(`${algorithm} usa una clave privada PEM, no un secreto compartido.`);
    }

    return importPKCS8(keyMaterial.privateKey, algorithm);
}

/**
 * Firma header + payload tal como los editó el usuario. No se agregan claims automáticos
 * (`iat`, `exp`): esta herramienta produce el token que se le pidió, no uno "mejorado".
 * El `alg` del header sí se fuerza al seleccionado, porque es con el que se firma de verdad.
 */
export async function signToken(
    header: JsonObject,
    payload: JsonObject,
    algorithm: JwsAlgorithm,
    keyMaterial: KeyMaterial
): Promise<SignResult> {
    try {
        const key = await resolveSigningKey(algorithm, keyMaterial);
        const token = await new SignJWT(payload)
            .setProtectedHeader({ ...header, alg: algorithm })
            .sign(key);

        return { ok: true, token };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Error de firma desconocido.',
        };
    }
}
