import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración E2E. Playwright arranca el frontend (o reutiliza el `yarn dev` que ya esté
 * corriendo). No hay backend que levantar: la app es 100% cliente.
 * Variables: PLAYWRIGHT_BASE_URL para apuntar a otro host.
 */
export default defineConfig({
    testDir: './e2e',
    // Los specs e2e llevan sufijo `.e2e.ts` para que Vitest nunca los recoja
    // (su patrón es *.test / *.spec).
    testMatch: '**/*.e2e.ts',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: 'list',
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'yarn dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
