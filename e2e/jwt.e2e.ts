import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test('el ejemplo llega decodificado y con la firma ya comprobada', async ({ page }) => {
    await page.getByRole('button', { name: 'Ejemplo' }).click();

    await expect(page.getByLabel('Token JWT')).not.toHaveValue('');
    await expect(page.getByLabel('Payload decodificado')).toContainText('Ada Lovelace');
    await expect(page.getByText('Firma válida')).toBeVisible();
});

test('cambiar el secreto invalida la firma sin tocar nada más', async ({ page }) => {
    await page.getByRole('button', { name: 'Ejemplo' }).click();
    await expect(page.getByText('Firma válida')).toBeVisible();

    await page.getByLabel('Secreto compartido').fill('un-secreto-que-no-es');

    await expect(page.getByText('Firma inválida')).toBeVisible();
    await expect(page.getByText('Firma válida')).toBeHidden();
});

test('un token con estructura rota se explica en el panel del token', async ({ page }) => {
    await page.getByLabel('Token JWT').fill('solo.dos');

    await expect(page.getByText('Un JWT son tres segmentos')).toBeVisible();
});

test('un token con tres segmentos pero contenido roto dice cuál segmento falló', async ({
    page,
}) => {
    await page.getByLabel('Token JWT').fill('esto.no.sirve');

    await expect(page.getByText('El segmento header')).toBeVisible();
});

test('el ciclo completo: editar claims, firmar, y que quede verificado', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo' }).click();
    await page.getByLabel('Payload decodificado').fill('{ "sub": "user_e2e", "role": "qa" }');
    await page.getByLabel('Secreto compartido').fill('secreto-de-la-prueba-e2e');

    await page.getByRole('button', { name: 'Firmar y generar' }).click();

    // El token firmado vuelve al panel de la izquierda y se verifica solo.
    await expect(page.getByLabel('Token JWT')).not.toHaveValue('');
    await expect(page.getByText('Firma válida')).toBeVisible();
    await expect(page.getByLabel('Payload decodificado')).toContainText('user_e2e');
});

test('el token vencido se distingue de la firma inválida', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo' }).click();
    const vencido = Math.floor(Date.now() / 1000) - 3600;
    await page.getByLabel('Payload decodificado').fill(`{ "sub": "user_e2e", "exp": ${vencido} }`);
    await page.getByLabel('Secreto compartido').fill('secreto-de-la-prueba-e2e');

    await page.getByRole('button', { name: 'Firmar y generar' }).click();

    await expect(page.getByText('Token vencido')).toBeVisible();
});
