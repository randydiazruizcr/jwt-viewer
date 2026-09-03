import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import type { JwsAlgorithm, KeyMaterial } from '@/lib/jwt/types';

/**
 * Par de claves PEM real, generado en el momento. Se generan en vez de venir hardcodeadas
 * para que los tests no dependan de una clave pegada en el repo que además envejece.
 */
export async function pemKeyMaterial(algorithm: JwsAlgorithm): Promise<KeyMaterial> {
    const { publicKey, privateKey } = await generateKeyPair(algorithm, { extractable: true });

    return {
        type: 'pem',
        publicKey: await exportSPKI(publicKey),
        privateKey: await exportPKCS8(privateKey),
    };
}
