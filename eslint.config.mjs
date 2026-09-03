import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

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
