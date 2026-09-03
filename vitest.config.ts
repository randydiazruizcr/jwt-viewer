import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Transforma JSX/TSX para los tests de componentes.
    plugins: [react()],
    resolve: {
        // Mismo alias que tsconfig/Next: `@/...` → `src/...`
        alias: { '@': resolve(root, 'src') },
    },
    test: {
        // En Windows el pool por defecto (forks) rompe al correr varios archivos a la vez;
        // threads lo evita.
        pool: 'threads',
        // Por defecto node (lógica pura, rápida). Los tests de componentes declaran
        // `// @vitest-environment jsdom` al inicio del archivo.
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        // Los specs e2e corren con Playwright, no con Vitest.
        exclude: ['e2e/**', 'node_modules/**'],
    },
});
