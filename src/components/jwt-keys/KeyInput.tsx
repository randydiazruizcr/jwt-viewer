'use client';

import { cn } from '@/lib/cn';
import { validatePrivateKeyPem, validatePublicKeyPem } from '@/lib/jwt/keys';
import { keyTypeFor } from '@/lib/jwt/types';
import { useJwtStore } from '@/store/jwt-store';

const FIELD_CLASS =
    'token-glyphs scrollbar-thin w-full resize-y rounded-md border border-line bg-sunk p-2.5 text-ink outline-none transition hover:border-line-strong placeholder:text-ink-muted';

function KeyField({
    id,
    label,
    hint,
    value,
    error,
    rows,
    placeholder,
    onChange,
}: {
    id: string;
    label: string;
    hint: string;
    value: string;
    error: string | null;
    rows: number;
    placeholder: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label
                    htmlFor={id}
                    className="text-xs font-semibold tracking-[0.14em] text-ink-mid uppercase"
                >
                    {label}
                </label>
                <span className="text-xs text-ink-muted">{hint}</span>
            </div>
            <textarea
                id={id}
                value={value}
                rows={rows}
                spellCheck={false}
                autoComplete="off"
                placeholder={placeholder}
                aria-invalid={error !== null}
                onChange={(event) => onChange(event.target.value)}
                className={cn(FIELD_CLASS, error && 'border-danger/60')}
            />
            {error ? (
                <p role="alert" className="mt-1.5 text-xs text-danger">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

/**
 * La forma del formulario la dicta el algoritmo: HS* es un secreto compartido; el resto es un
 * par de claves donde la pública verifica y la privada firma. Mostrar los tres campos siempre
 * obligaría al usuario a saber cuál de ellos aplica a lo que está haciendo.
 */
export function KeyInput() {
    const algorithm = useJwtStore((state) => state.algorithm);
    const keyMaterial = useJwtStore((state) => state.keyMaterial);
    const setKeyMaterial = useJwtStore((state) => state.setKeyMaterial);

    if (keyTypeFor(algorithm) === 'secret') {
        const secret = keyMaterial.type === 'secret' ? keyMaterial.secret : '';

        return (
            <KeyField
                id="key-secret"
                label="Secreto compartido"
                hint={`${algorithm} · firma y verifica`}
                value={secret}
                error={null}
                rows={3}
                placeholder="tu-secreto-de-256-bits"
                onChange={(value) => setKeyMaterial({ type: 'secret', secret: value })}
            />
        );
    }

    const publicKey = keyMaterial.type === 'pem' ? keyMaterial.publicKey : '';
    const privateKey = keyMaterial.type === 'pem' ? keyMaterial.privateKey : '';

    return (
        <div className="space-y-4">
            <KeyField
                id="key-public"
                label="Clave pública"
                hint="SPKI · verifica"
                value={publicKey}
                error={validatePublicKeyPem(publicKey)}
                rows={5}
                placeholder="-----BEGIN PUBLIC KEY-----"
                onChange={(value) => setKeyMaterial({ type: 'pem', publicKey: value, privateKey })}
            />
            <KeyField
                id="key-private"
                label="Clave privada"
                hint="PKCS#8 · firma"
                value={privateKey}
                error={validatePrivateKeyPem(privateKey)}
                rows={5}
                placeholder="-----BEGIN PRIVATE KEY-----"
                onChange={(value) => setKeyMaterial({ type: 'pem', publicKey, privateKey: value })}
            />
        </div>
    );
}
