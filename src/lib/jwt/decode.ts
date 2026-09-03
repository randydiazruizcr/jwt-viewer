import type { DecodeResult, JsonObject } from './types';

/**
 * base64url → texto. No se usa el decodificador de `jose` porque acá hace falta distinguir
 * "no es base64" de "no es JSON" para poder decir cuál de las dos cosas falló.
 */
function base64UrlToText(segment: string): string {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

type SegmentResult =
    | { ok: true; value: JsonObject }
    | {
          ok: false;
          error: {
              code: 'invalid_base64' | 'invalid_json';
              part: 'header' | 'payload';
              message: string;
          };
      };

function decodeSegment(segment: string, part: 'header' | 'payload'): SegmentResult {
    let text: string;

    try {
        text = base64UrlToText(segment);
    } catch {
        return {
            ok: false,
            error: {
                code: 'invalid_base64',
                part,
                message: `El segmento ${part === 'header' ? 'header' : 'payload'} no es base64url válido.`,
            },
        };
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(text);
    } catch {
        return {
            ok: false,
            error: {
                code: 'invalid_json',
                part,
                message: `El segmento ${part === 'header' ? 'header' : 'payload'} no contiene JSON válido.`,
            },
        };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
            ok: false,
            error: {
                code: 'invalid_json',
                part,
                message: `El segmento ${part === 'header' ? 'header' : 'payload'} debe ser un objeto JSON.`,
            },
        };
    }

    return { ok: true, value: parsed as JsonObject };
}

/**
 * Decodifica header y payload sin tocar la firma. Es instantáneo y no necesita clave: ver el
 * contenido de un token y comprobar que sea auténtico son dos operaciones separadas.
 */
export function decodeToken(rawToken: string): DecodeResult {
    const parts = rawToken.trim().split('.');

    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
        return {
            ok: false,
            error: {
                code: 'malformed_structure',
                message: 'Un JWT son tres segmentos no vacíos separados por puntos.',
            },
        };
    }

    const [headerSegment, payloadSegment, signature] = parts as [string, string, string];

    const header = decodeSegment(headerSegment, 'header');
    if (!header.ok) return header;

    const payload = decodeSegment(payloadSegment, 'payload');
    if (!payload.ok) return payload;

    return { ok: true, value: { header: header.value, payload: payload.value, signature } };
}
