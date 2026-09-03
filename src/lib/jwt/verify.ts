import { errors, importSPKI, jwtVerify } from 'jose';
import type { JwsAlgorithm, KeyMaterial, VerificationState } from './types';
import { keyTypeFor, secretToBytes } from './types';

async function resolveVerificationKey(
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
        throw new Error(`${algorithm} usa una clave pública PEM, no un secreto compartido.`);
    }

    return importSPKI(keyMaterial.publicKey, algorithm);
}

/**
 * Verifica la firma y las fechas del token. Nunca lanza: cada modo de fallo se traduce a un
 * estado que la UI pinta bajo el panel de firma.
 */
export async function verifyToken(
    rawToken: string,
    algorithm: JwsAlgorithm,
    keyMaterial: KeyMaterial
): Promise<VerificationState> {
    try {
        const key = await resolveVerificationKey(algorithm, keyMaterial);
        await jwtVerify(rawToken, key, { algorithms: [algorithm] });
        return { status: 'valid' };
    } catch (error) {
        // JWTExpired extiende JWTClaimValidationFailed, así que va primero.
        if (error instanceof errors.JWTExpired) {
            return { status: 'expired', message: 'El token venció: el claim `exp` ya pasó.' };
        }

        if (error instanceof errors.JWSSignatureVerificationFailed) {
            return { status: 'invalid', message: 'La firma no coincide con la clave indicada.' };
        }

        if (error instanceof errors.JWTClaimValidationFailed) {
            return { status: 'invalid', message: `Claim inválido: ${error.message}` };
        }

        if (error instanceof errors.JOSEAlgNotAllowed) {
            return {
                status: 'invalid',
                message: `El header del token no declara ${algorithm}; la firma se verifica contra otro algoritmo.`,
            };
        }

        if (error instanceof errors.JWSInvalid || error instanceof errors.JWTInvalid) {
            return { status: 'error', message: 'El token no tiene una estructura JWS válida.' };
        }

        return {
            status: 'error',
            message: error instanceof Error ? error.message : 'Error de verificación desconocido.',
        };
    }
}
