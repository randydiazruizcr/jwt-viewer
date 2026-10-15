import Module, { createRequire } from 'node:module';

// TypeScript 7 es el compilador nativo y ya no publica la API de JavaScript del
// compilador (vuelve en la 7.1). typescript-eslint, que entra por
// eslint-config-next, hace require('typescript'), ve la major 7 y aborta a
// propósito. Hasta que soporte TS >= 7.1 (typescript-eslint#10940) redirigimos
// el especificador `typescript` a @typescript/typescript6, el paquete que
// Microsoft publica justo para este uso lado a lado. El puente sólo vale dentro
// del proceso de ESLint: tsc, next build, Vitest y el editor siguen con la 7.
const require = createRequire(import.meta.url);
const resolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, ...rest) {
    if (request === 'typescript') {
        return resolveFilename.call(this, '@typescript/typescript6', ...rest);
    }
    if (request.startsWith('typescript/')) {
        return resolveFilename.call(
            this,
            `@typescript/typescript6/${request.slice('typescript/'.length)}`,
            ...rest,
        );
    }
    return resolveFilename.call(this, request, ...rest);
};

// Se cargan con require (no con import estático) para que el puente de arriba
// quede instalado antes de evaluar eslint-config-next y, con él, typescript-eslint.
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypeScript = require('eslint-config-next/typescript');
const prettier = require('eslint-config-prettier');

const eslintConfig = [
    {
        ignores: [
            '**/.next/**',
            '**/node_modules/**',
            '**/coverage/**',
            '**/out/**',
            '**/build/**',
            'next-env.d.ts',
        ],
    },
    ...nextCoreWebVitals,
    ...nextTypeScript,
    prettier,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
        },
    },
];

export default eslintConfig;
