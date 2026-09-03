import { SignJWT } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { secretToBytes } from '@/lib/jwt/types';
import { pemKeyMaterial } from '@/test/key-fixtures';
import { EXAMPLE_SECRET, useJwtStore } from './jwt-store';

const SECRET = 'un-secreto-de-al-menos-256-bits!!';

async function hs256Token(payload: Record<string, unknown> = { sub: 'user_1' }): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .sign(secretToBytes(SECRET));
}

const store = () => useJwtStore.getState();

beforeEach(() => {
    store().reset();
});

describe('setRawToken', () => {
    it('decodifica el token y llena los dos editores', async () => {
        store().setRawToken(await hs256Token({ sub: 'user_1', admin: true }));

        expect(store().header).toEqual({ alg: 'HS256', typ: 'JWT' });
        expect(store().payload).toEqual({ sub: 'user_1', admin: true });
        expect(JSON.parse(store().payloadText)).toEqual({ sub: 'user_1', admin: true });
        expect(store().tokenError).toBeNull();
    });

    it('adopta el algoritmo que declara el header del token', async () => {
        const token = await new SignJWT({ sub: 'x' })
            .setProtectedHeader({ alg: 'HS512', typ: 'JWT' })
            .sign(secretToBytes(SECRET));

        store().setRawToken(token);

        expect(store().algorithm).toBe('HS512');
    });

    it('sin clave cargada no verifica nada: queda en idle, no en inválido', async () => {
        store().setRawToken(await hs256Token());
        await store().verifyNow();

        expect(store().verification).toEqual({ status: 'idle' });
    });

    it('guarda el motivo cuando el token está mal formado', () => {
        store().setRawToken('no-es-un-jwt');

        expect(store().tokenError).toContain('tres segmentos');
        expect(store().header).toBeNull();
        expect(store().payload).toBeNull();
    });

    it('vaciar el campo limpia el error y los paneles', () => {
        store().setRawToken('no-es-un-jwt');
        store().setRawToken('');

        expect(store().tokenError).toBeNull();
        expect(store().headerText).toBe('');
    });
});

describe('verificación automática', () => {
    it('con el secreto correcto marca la firma como válida', async () => {
        store().setRawToken(await hs256Token());
        store().setKeyMaterial({ type: 'secret', secret: SECRET });
        await store().verifyNow();

        expect(store().verification).toEqual({ status: 'valid' });
    });

    it('con el secreto equivocado marca la firma como inválida', async () => {
        store().setRawToken(await hs256Token());
        store().setKeyMaterial({ type: 'secret', secret: 'otro-secreto' });
        await store().verifyNow();

        expect(store().verification).toMatchObject({ status: 'invalid' });
    });

    it('un token vencido se distingue de una firma inválida', async () => {
        const vencido = Math.floor(Date.now() / 1000) - 120;
        store().setRawToken(await hs256Token({ sub: 'user_1', exp: vencido }));
        store().setKeyMaterial({ type: 'secret', secret: SECRET });
        await store().verifyNow();

        expect(store().verification).toMatchObject({ status: 'expired' });
    });
});

describe('edición de header y payload', () => {
    it('marca el JSON roto sin descartar lo que se escribió', async () => {
        store().setRawToken(await hs256Token());
        store().setPayloadText('{ "sub": ');

        expect(store().payloadText).toBe('{ "sub": ');
        expect(store().payload).toBeNull();
        expect(store().payloadError).not.toBeNull();
        expect(store().canGenerate()).toBe(false);
    });

    it('al volver a ser JSON válido se limpia el error', async () => {
        store().setRawToken(await hs256Token());
        store().setPayloadText('{ "sub": ');
        store().setPayloadText('{ "sub": "user_2" }');

        expect(store().payloadError).toBeNull();
        expect(store().payload).toEqual({ sub: 'user_2' });
    });

    it('editar el header cambia el algoritmo si declara uno conocido', async () => {
        store().setRawToken(await hs256Token());
        store().setHeaderText('{ "alg": "HS384", "typ": "JWT" }');

        expect(store().algorithm).toBe('HS384');
    });
});

describe('setAlgorithm', () => {
    it('cambiar de familia descarta el material de clave anterior', () => {
        store().setKeyMaterial({ type: 'secret', secret: SECRET });
        store().setAlgorithm('RS256');

        expect(store().keyMaterial).toEqual({ type: 'pem', publicKey: '', privateKey: '' });
    });

    it('dentro de la misma familia conserva el secreto ya escrito', () => {
        store().setKeyMaterial({ type: 'secret', secret: SECRET });
        store().setAlgorithm('HS512');

        expect(store().keyMaterial).toEqual({ type: 'secret', secret: SECRET });
    });

    it('sincroniza el `alg` del header con el algoritmo elegido', async () => {
        store().setRawToken(await hs256Token());
        store().setAlgorithm('HS384');

        expect(store().header).toMatchObject({ alg: 'HS384' });
        expect(JSON.parse(store().headerText)).toMatchObject({ alg: 'HS384' });
    });
});

describe('generate', () => {
    it('firma lo editado y verifica el resultado sin pasos extra', async () => {
        store().startNewToken();
        store().setPayloadText('{ "sub": "user_7", "role": "admin" }');
        store().setKeyMaterial({ type: 'secret', secret: SECRET });

        await store().generate();
        await store().verifyNow();

        expect(store().rawToken.split('.')).toHaveLength(3);
        expect(store().payload).toEqual({ sub: 'user_7', role: 'admin' });
        expect(store().verification).toEqual({ status: 'valid' });
        expect(store().mode).toBe('decode');
    });

    it('firma con RS256 usando la clave privada PKCS#8', async () => {
        const keys = await pemKeyMaterial('RS256');
        store().startNewToken();
        store().setAlgorithm('RS256');
        store().setPayloadText('{ "sub": "user_7" }');
        store().setKeyMaterial(keys);

        await store().generate();
        await store().verifyNow();

        expect(store().verification).toEqual({ status: 'valid' });
    });

    it('sin clave no firma y explica qué falta', async () => {
        store().startNewToken();

        await store().generate();

        expect(store().signError).toContain('secreto');
        expect(store().rawToken).toBe('');
    });

    it('con JSON roto no firma', async () => {
        store().startNewToken();
        store().setKeyMaterial({ type: 'secret', secret: SECRET });
        store().setPayloadText('{ roto');

        await store().generate();

        expect(store().signError).toContain('JSON');
    });
});

describe('loadExample', () => {
    it('deja la herramienta con un token real ya verificado', async () => {
        await store().loadExample();
        await store().verifyNow();

        expect(store().verification).toEqual({ status: 'valid' });
        expect(store().payload).toMatchObject({ name: 'Ada Lovelace' });
        expect(store().keyMaterial).toEqual({ type: 'secret', secret: EXAMPLE_SECRET });
    });
});

describe('startNewToken', () => {
    it('deja los paneles en modo edición con una plantilla mínima', () => {
        store().startNewToken();

        expect(store().mode).toBe('edit');
        expect(store().header).toMatchObject({ alg: 'HS256', typ: 'JWT' });
        expect(store().payload).toHaveProperty('iat');
        expect(store().rawToken).toBe('');
    });
});
