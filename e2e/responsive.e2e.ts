import { expect, test } from '@playwright/test';

/**
 * Lo que se cuida acá es una sola cosa, y es la que se rompió: que el veredicto de la firma y
 * el botón que firma se vean SIN scrollear, en las pantallas donde de verdad se usa esto. La
 * app vivía dentro de un `h-dvh` con un scroll anidado que en un portátil de 1366×768 dejaba
 * el botón fuera de la pantalla.
 */
const PANTALLAS = [
    { nombre: 'teléfono', width: 390, height: 844 },
    { nombre: 'tablet', width: 768, height: 1024 },
    { nombre: 'portátil', width: 1366, height: 768 },
];

for (const pantalla of PANTALLAS) {
    test.describe(`en ${pantalla.nombre} (${pantalla.width}×${pantalla.height})`, () => {
        test.use({ viewport: { width: pantalla.width, height: pantalla.height } });

        test('la firma se ve sin scrollear y nada desborda a lo ancho', async ({ page }) => {
            await page.goto('/');
            await page.getByRole('button', { name: 'Ejemplo' }).click();

            await expect(page.getByText('Firma válida')).toBeVisible();

            // `toBeInViewport` es la aserción exacta: "visible" no distingue estar en pantalla
            // de estar renderizado más abajo, dentro de un contenedor que scrollea.
            await expect(page.getByRole('status')).toBeInViewport();
            await expect(page.getByRole('button', { name: 'Firmar y generar' })).toBeInViewport();

            // RS256 es el caso pesado: dos campos PEM de cinco filas empujan todo hacia abajo.
            await page.selectOption('#algorithm', 'RS256');
            await expect(page.getByRole('button', { name: 'Firmar y generar' })).toBeInViewport();

            const desbordaAlAncho = await page.evaluate(() => {
                const de = document.documentElement;
                return de.scrollWidth > de.clientWidth;
            });
            expect(desbordaAlAncho).toBe(false);
        });
    });
}
