import { create } from 'zustand';
import { decodeToken } from '@/lib/jwt/decode';
import { emptyKeyMaterial, hasSigningKey, hasVerificationKey } from '@/lib/jwt/keys';
import { signToken } from '@/lib/jwt/sign';
import { verifyToken } from '@/lib/jwt/verify';
import {
    isJwsAlgorithm,
    keyTypeFor,
    type JsonObject,
    type JwsAlgorithm,
    type KeyMaterial,
    type VerificationState,
} from '@/lib/jwt/types';

/** El secreto del token de ejemplo. Es público a propósito: sirve para probar la herramienta. */
export const EXAMPLE_SECRET = 'jwt-viewer-demo-secret';

type Mode = 'decode' | 'edit';

type JwtState = {
    rawToken: string;
    /** Texto crudo de los editores. Puede ser JSON inválido mientras se escribe. */
    headerText: string;
    payloadText: string;
    /** Último JSON que sí parseó. `null` mientras el texto de arriba esté roto. */
    header: JsonObject | null;
    payload: JsonObject | null;
    headerError: string | null;
    payloadError: string | null;
    tokenError: string | null;
    signError: string | null;
    algorithm: JwsAlgorithm;
    keyMaterial: KeyMaterial;
    verification: VerificationState;
    mode: Mode;
};

type JwtActions = {
    setRawToken: (rawToken: string) => void;
    setHeaderText: (text: string) => void;
    setPayloadText: (text: string) => void;
    setAlgorithm: (algorithm: JwsAlgorithm) => void;
    setKeyMaterial: (keyMaterial: KeyMaterial) => void;
    startNewToken: () => void;
    loadExample: () => Promise<void>;
    generate: () => Promise<void>;
    /** Verifica con el estado actual. Los setters la disparan solos; los tests la esperan. */
    verifyNow: () => Promise<void>;
    canGenerate: () => boolean;
    reset: () => void;
};

export type JwtStore = JwtState & JwtActions;

const pretty = (value: JsonObject): string => JSON.stringify(value, null, 2);

function parseJsonObject(text: string): { value: JsonObject } | { error: string } {
    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch (error) {
        return { error: error instanceof Error ? error.message : 'JSON inválido.' };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { error: 'Debe ser un objeto JSON.' };
    }

    return { value: parsed as JsonObject };
}

const initialState: JwtState = {
    rawToken: '',
    headerText: '',
    payloadText: '',
    header: null,
    payload: null,
    headerError: null,
    payloadError: null,
    tokenError: null,
    signError: null,
    algorithm: 'HS256',
    keyMaterial: { type: 'secret', secret: '' },
    verification: { status: 'idle' },
    mode: 'decode',
};

/**
 * Contador de verificaciones en vuelo. Al teclear un secreto se disparan varias seguidas y
 * pueden resolver desordenadas; solo la última tiene derecho a escribir el resultado.
 */
let verificationRun = 0;

export const useJwtStore = create<JwtStore>((set, get) => ({
    ...initialState,

    setRawToken: (rawToken) => {
        if (rawToken.trim().length === 0) {
            set({
                rawToken,
                header: null,
                payload: null,
                headerText: '',
                payloadText: '',
                headerError: null,
                payloadError: null,
                tokenError: null,
                signError: null,
                verification: { status: 'idle' },
                mode: 'decode',
            });
            return;
        }

        const decoded = decodeToken(rawToken);

        if (!decoded.ok) {
            set({
                rawToken,
                header: null,
                payload: null,
                headerText: '',
                payloadText: '',
                headerError: null,
                payloadError: null,
                tokenError: decoded.error.message,
                verification: { status: 'idle' },
                mode: 'decode',
            });
            return;
        }

        const { header, payload } = decoded.value;
        const declaredAlg = header.alg;

        set({
            rawToken,
            header,
            payload,
            headerText: pretty(header),
            payloadText: pretty(payload),
            headerError: null,
            payloadError: null,
            tokenError: null,
            signError: null,
            // El token manda: si declara un algoritmo conocido, se verifica contra ese.
            algorithm: isJwsAlgorithm(declaredAlg) ? declaredAlg : get().algorithm,
            mode: 'decode',
        });

        void get().verifyNow();
    },

    setHeaderText: (text) => {
        const parsed = parseJsonObject(text);

        if ('error' in parsed) {
            set({ headerText: text, header: null, headerError: parsed.error, mode: 'edit' });
            return;
        }

        const declaredAlg = parsed.value.alg;

        set({
            headerText: text,
            header: parsed.value,
            headerError: null,
            algorithm: isJwsAlgorithm(declaredAlg) ? declaredAlg : get().algorithm,
            mode: 'edit',
        });
    },

    setPayloadText: (text) => {
        const parsed = parseJsonObject(text);

        if ('error' in parsed) {
            set({ payloadText: text, payload: null, payloadError: parsed.error, mode: 'edit' });
            return;
        }

        set({ payloadText: text, payload: parsed.value, payloadError: null, mode: 'edit' });
    },

    setAlgorithm: (algorithm) => {
        const { header, keyMaterial } = get();
        // Cambiar de familia (HS ↔ RS/ES/PS) cambia la forma de la clave: lo que había
        // cargado ya no sirve, y arrastrarlo solo produce errores confusos.
        const nextKey =
            keyTypeFor(algorithm) === keyMaterial.type ? keyMaterial : emptyKeyMaterial(algorithm);
        const nextHeader = header ? { ...header, alg: algorithm } : header;

        set({
            algorithm,
            keyMaterial: nextKey,
            header: nextHeader,
            headerText: nextHeader ? pretty(nextHeader) : get().headerText,
        });

        void get().verifyNow();
    },

    setKeyMaterial: (keyMaterial) => {
        set({ keyMaterial, signError: null });
        void get().verifyNow();
    },

    startNewToken: () => {
        const { algorithm } = get();
        const header: JsonObject = { alg: algorithm, typ: 'JWT' };
        const payload: JsonObject = {
            sub: '',
            name: '',
            iat: Math.floor(Date.now() / 1000),
        };

        set({
            ...initialState,
            algorithm,
            keyMaterial: emptyKeyMaterial(algorithm),
            header,
            payload,
            headerText: pretty(header),
            payloadText: pretty(payload),
            mode: 'edit',
        });
    },

    loadExample: async () => {
        const now = Math.floor(Date.now() / 1000);
        const header: JsonObject = { alg: 'HS256', typ: 'JWT' };
        const payload: JsonObject = {
            sub: 'user_9f2a',
            name: 'Ada Lovelace',
            role: 'admin',
            iat: now,
            exp: now + 3600,
        };
        const keyMaterial: KeyMaterial = { type: 'secret', secret: EXAMPLE_SECRET };

        const signed = await signToken(header, payload, 'HS256', keyMaterial);

        if (!signed.ok) {
            set({ signError: signed.message });
            return;
        }

        set({ algorithm: 'HS256', keyMaterial });
        get().setRawToken(signed.token);
    },

    generate: async () => {
        const { header, payload, algorithm, keyMaterial } = get();

        if (!header || !payload) {
            set({ signError: 'Corregí el JSON del header y del payload antes de firmar.' });
            return;
        }

        if (!hasSigningKey(algorithm, keyMaterial)) {
            set({
                signError:
                    keyTypeFor(algorithm) === 'secret'
                        ? 'Falta el secreto para firmar.'
                        : 'Falta una clave privada PKCS#8 válida para firmar.',
            });
            return;
        }

        const signed = await signToken(header, payload, algorithm, keyMaterial);

        if (!signed.ok) {
            set({ signError: signed.message });
            return;
        }

        // Vuelve por el camino de decode: el token recién firmado se decodifica y se verifica
        // solo, así el ciclo generar → comprobar queda cerrado sin tocar nada más.
        set({ signError: null });
        get().setRawToken(signed.token);
    },

    verifyNow: async () => {
        const { rawToken, algorithm, keyMaterial, header, payload } = get();
        const run = ++verificationRun;

        if (rawToken.trim().length === 0 || !header || !payload) {
            set({ verification: { status: 'idle' } });
            return;
        }

        if (!hasVerificationKey(algorithm, keyMaterial)) {
            set({ verification: { status: 'idle' } });
            return;
        }

        const result = await verifyToken(rawToken, algorithm, keyMaterial);

        if (run === verificationRun) set({ verification: result });
    },

    canGenerate: () => {
        const { header, payload, algorithm, keyMaterial } = get();
        return Boolean(header) && Boolean(payload) && hasSigningKey(algorithm, keyMaterial);
    },

    reset: () => {
        verificationRun += 1;
        set({ ...initialState });
    },
}));
