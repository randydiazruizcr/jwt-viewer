'use client';

import { FilePlus2, KeyRound, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { ClaimsTimeline } from '@/components/jwt-editor/ClaimsTimeline';
import { JsonEditor } from '@/components/jwt-editor/JsonEditor';
import { SignatureStatus } from '@/components/jwt-editor/SignatureStatus';
import { TokenInput } from '@/components/jwt-editor/TokenInput';
import { AlgorithmSelect } from '@/components/jwt-keys/AlgorithmSelect';
import { KeyInput } from '@/components/jwt-keys/KeyInput';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { Panel } from '@/components/ui/Panel';
import { useJwtStore } from '@/store/jwt-store';

function Wordmark() {
    return (
        <div className="flex items-center gap-2.5">
            <span
                aria-hidden
                className="flex h-7 items-end gap-0.75 rounded-sm border border-line bg-sunk px-1.5 py-1"
            >
                <i className="block h-2.5 w-0.75 rounded-full bg-seg-header" />
                <i className="block h-4 w-0.75 rounded-full bg-seg-payload" />
                <i className="block h-3 w-0.75 rounded-full bg-seg-signature" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">
                JWT Viewer
                <span className="ml-2 font-mono text-xs font-normal text-ink-muted">RFC 7519</span>
            </span>
        </div>
    );
}

export default function Home() {
    const rawToken = useJwtStore((state) => state.rawToken);
    const headerText = useJwtStore((state) => state.headerText);
    const payloadText = useJwtStore((state) => state.payloadText);
    const headerError = useJwtStore((state) => state.headerError);
    const payloadError = useJwtStore((state) => state.payloadError);
    const payload = useJwtStore((state) => state.payload);
    const signError = useJwtStore((state) => state.signError);
    const verification = useJwtStore((state) => state.verification);
    const mode = useJwtStore((state) => state.mode);
    const canGenerate = useJwtStore((state) => state.canGenerate());

    const setHeaderText = useJwtStore((state) => state.setHeaderText);
    const setPayloadText = useJwtStore((state) => state.setPayloadText);
    const startNewToken = useJwtStore((state) => state.startNewToken);
    const loadExample = useJwtStore((state) => state.loadExample);
    const generate = useJwtStore((state) => state.generate);
    const reset = useJwtStore((state) => state.reset);

    return (
        // La altura se bloquea SOLO en escritorio, que es donde entran los tres paneles a la
        // vez. Debajo de `lg` la página scrollea como una página normal: encerrarla en `h-dvh`
        // escondía media herramienta detrás de un scroll anidado que nadie ve.
        <div className="flex min-h-dvh flex-col lg:h-dvh">
            <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line px-4 py-3">
                <Wordmark />

                <p className="flex items-center gap-1.5 text-xs text-ink-mid">
                    <ShieldCheck aria-hidden className="size-3.5 text-ok" />
                    Todo ocurre en tu navegador: ni el token ni las claves salen de esta pestaña.
                </p>

                <div className="ml-auto flex items-center gap-2">
                    <Button onClick={() => void loadExample()}>
                        <Sparkles aria-hidden className="size-3.5" />
                        Ejemplo
                    </Button>
                    <Button onClick={startNewToken}>
                        <FilePlus2 aria-hidden className="size-3.5" />
                        Nuevo
                    </Button>
                    <Button onClick={reset} aria-label="Limpiar todo">
                        <Trash2 aria-hidden className="size-3.5" />
                        Limpiar
                    </Button>
                </div>
            </header>

            <main className="grid gap-4 p-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <Panel
                    title="Token"
                    actions={<CopyButton value={rawToken} label="Copiar el token" />}
                    className="min-h-64"
                >
                    <TokenInput />
                </Panel>

                <div className="scrollbar-thin flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
                    <Panel
                        title="Header"
                        accentClassName="bg-seg-header"
                        actions={<CopyButton value={headerText} label="Copiar el header" />}
                        className="min-h-36 shrink-0"
                    >
                        <JsonEditor
                            label="Header decodificado"
                            value={headerText}
                            error={headerError}
                            placeholder='{ "alg": "HS256", "typ": "JWT" }'
                            onChange={setHeaderText}
                        />
                    </Panel>

                    <Panel
                        title="Payload"
                        accentClassName="bg-seg-payload"
                        actions={<CopyButton value={payloadText} label="Copiar el payload" />}
                        className="min-h-56 shrink-0 grow"
                    >
                        <div className="flex h-full min-h-0 flex-col">
                            <JsonEditor
                                label="Payload decodificado"
                                value={payloadText}
                                error={payloadError}
                                placeholder='{ "sub": "user_1" }'
                                onChange={setPayloadText}
                            />
                            <ClaimsTimeline payload={payload} />
                        </div>
                    </Panel>

                    <Panel
                        title="Firma"
                        accentClassName="bg-seg-signature"
                        actions={<AlgorithmSelect />}
                        className="shrink-0"
                    >
                        <div className="space-y-3 p-3">
                            <KeyInput />

                            {signError ? (
                                <p role="alert" className="text-sm text-danger">
                                    {signError}
                                </p>
                            ) : null}
                        </div>
                    </Panel>

                    {/*
                     * El veredicto de la firma y el botón que firma van pegados al pie de la
                     * columna. Al final del scroll quedaban fuera de pantalla en cualquier
                     * portátil, y son justo las dos cosas que se miran mientras se teclea la
                     * clave.
                     */}
                    <div className="sticky bottom-0 z-10 shrink-0 rounded-lg border border-line bg-surface-raised/95 p-3 shadow-panel backdrop-blur">
                        <div className="flex flex-wrap items-center gap-3">
                            <SignatureStatus
                                verification={verification}
                                className="min-w-56 flex-1"
                            />

                            <Button
                                variant="primary"
                                disabled={!canGenerate}
                                onClick={() => void generate()}
                            >
                                <KeyRound aria-hidden className="size-3.5" />
                                Firmar y generar
                            </Button>
                        </div>

                        {mode === 'edit' ? (
                            <p className="mt-2 text-xs text-ink-muted">
                                Editaste los claims: firmá para obtener el token nuevo.
                            </p>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
