/** Algoritmos de firma soportados: las cuatro familias que cubre Web Crypto vía `jose`. */
export const JWS_ALGORITHMS = [
    'HS256',
    'HS384',
    'HS512',
    'RS256',
    'RS384',
    'RS512',
    'ES256',
    'ES384',
    'ES512',
    'PS256',
    'PS384',
    'PS512',
] as const;

export type JwsAlgorithm = (typeof JWS_ALGORITHMS)[number];

export function isJwsAlgorithm(value: unknown): value is JwsAlgorithm {
    return typeof value === 'string' && (JWS_ALGORITHMS as readonly string[]).includes(value);
}

/**
 * HS* usa un secreto compartido (la misma cadena firma y verifica). El resto usa un par de
 * claves: la privada firma, la pública verifica. Por eso el material de clave es una unión y
 * no un solo campo — el formulario cambia de forma según el algoritmo.
 */
export type KeyMaterial =
    { type: 'secret'; secret: string } | { type: 'pem'; publicKey: string; privateKey: string };

export function keyTypeFor(algorithm: JwsAlgorithm): KeyMaterial['type'] {
    return algorithm.startsWith('HS') ? 'secret' : 'pem';
}

/**
 * El secreto como bytes, construidos con el `Uint8Array` GLOBAL a propósito.
 *
 * `jose` valida la clave con `key instanceof Uint8Array`, y `TextEncoder` puede devolver un
 * array de otro realm —pasa bajo jsdom— con lo que ese `instanceof` da falso y el error que
 * sale es indescifrable: "must be Uint8Array. Received an instance of Uint8Array".
 * `Uint8Array.from` usa el constructor global, el mismo contra el que `jose` compara.
 */
export function secretToBytes(secret: string): Uint8Array {
    return Uint8Array.from(new TextEncoder().encode(secret));
}

export type JsonObject = Record<string, unknown>;

export type DecodedToken = {
    header: JsonObject;
    payload: JsonObject;
    /** El tercer segmento tal cual viene, sin decodificar: son bytes de firma, no JSON. */
    signature: string;
};

export type DecodeErrorCode = 'malformed_structure' | 'invalid_base64' | 'invalid_json';

export type DecodeError = {
    code: DecodeErrorCode;
    /** Qué segmento falló; ausente cuando el problema es la estructura del token completo. */
    part?: 'header' | 'payload';
    message: string;
};

export type DecodeResult = { ok: true; value: DecodedToken } | { ok: false; error: DecodeError };

/**
 * `expired` se separa de `invalid` a propósito: para quien depura auth, una firma que no
 * coincide y un token vencido son dos problemas distintos con dos soluciones distintas.
 */
export type VerificationState =
    | { status: 'idle' }
    | { status: 'valid' }
    | { status: 'expired'; message: string }
    | { status: 'invalid'; message: string }
    | { status: 'error'; message: string };

export type SignResult = { ok: true; token: string } | { ok: false; message: string };
