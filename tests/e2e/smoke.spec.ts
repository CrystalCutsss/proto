import { expect, test } from '@playwright/test';

test('hub lists prototypes and filters them', async ({ page }) => {
  const registry = await (await page.request.get('/registry.json')).json();
  await page.goto('/');
  await expect(page.locator('.hub-card')).toHaveCount(registry.prototypes.length);
  // Card previews load when site:build took screenshots (CI builds with --no-previews: no <img> then).
  for (const img of await page.locator('img.hub-preview').all()) {
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.getByLabel('Поиск').fill('three.js');
  await expect(page.locator('.hub-card')).toHaveCount(1);
  await expect(page).toHaveURL(/\?q=three\.js/);
  await page.getByLabel('Поиск').fill('');
  await page.getByRole('button', { name: '#basic' }).click();
  await expect(page.locator('.hub-card h2')).toHaveText(['Демо: базовый']);
});

test('prototype path redirects to the default version, keeping the query', async ({ page }) => {
  // demo-basic: v1 frozen, v2 review → "latest" resolves to v2.
  await page.goto('/p/demo-basic/?shell=0');
  await expect(page).toHaveURL(/\/p\/demo-basic\/v2\/\?shell=0$/);
  const res = await page.request.get('/p/demo-basic/latest/', { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()['location']).toBe('/p/demo-basic/v2/');
});

test('shell switches versions and keeps the screen only when it exists', async ({ page }) => {
  await page.goto('/p/demo-basic/v2/#/details');
  const pill = page.getByRole('button', { name: 'Версии прототипа' });
  await expect(pill).toContainText('demo-basic · v2');
  await pill.click();
  await page.getByLabel('Версия').selectOption('v1');
  await expect(page).toHaveURL(/\/p\/demo-basic\/v1\/#\/details$/);
  await expect(page.locator('h1')).toHaveText('Подробности');

  await page.goto('/p/demo-basic/v2/#/settings');
  await page.getByRole('button', { name: 'Версии прототипа' }).click();
  await page.getByLabel('Версия').selectOption('v1');
  await expect(page).toHaveURL(/\/p\/demo-basic\/v1\/$/);
});

test('?shell=0 removes the panel and Alt+Shift+H hides it', async ({ page }) => {
  await page.goto('/p/demo-basic/v2/?shell=0');
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.locator('proto-shell')).toHaveCount(0);

  await page.goto('/p/demo-basic/v2/');
  const pill = page.getByRole('button', { name: 'Версии прототипа' });
  await expect(pill).toBeVisible();
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect(pill).toBeHidden();
  await page.reload();
  await expect(page.locator('proto-shell')).toBeAttached();
  await expect(pill).toBeHidden();
});

test('compare page shows two versions side by side without the shell', async ({ page }) => {
  await page.goto('/p/demo-basic/compare/?a=v1&b=v2');
  await expect(page.locator('#frame-a')).toHaveAttribute('src', '/p/demo-basic/v1/?shell=0');
  await expect(page.locator('#frame-b')).toHaveAttribute('src', '/p/demo-basic/v2/?shell=0');
  await expect(page.frameLocator('#frame-b').locator('h1')).toHaveText('Демо: базовый');
});

test('3D templates render a canvas', async ({ page }) => {
  for (const slug of ['demo-three', 'demo-r3f']) {
    await page.goto(`/p/${slug}/?shell=0`);
    await expect(page.locator('canvas').first()).toBeVisible();
  }
});

test('unknown paths are 404 and every response is private and noindex', async ({ request }) => {
  expect((await request.get('/p/nope/')).status()).toBe(404);
  expect((await request.get('/p/demo-basic/v9/')).status()).toBe(404);
  const res = await request.get('/p/demo-basic/v1/');
  expect(res.headers()['x-robots-tag']).toContain('noindex');
  expect(res.headers()['cache-control']).toMatch(/^private/);
});

test('pilot flow pushes screens with the yellow button and pops them back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/p/credit-activation/v1/?shell=0#/');
  const top = page.locator('section:not([inert])');
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await expect(top.getByRole('heading', { name: 'Выберите условия' })).toBeVisible();
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await top.getByRole('button', { name: 'Назад' }).click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$/);
  await expect(top.getByRole('heading', { name: /Одобрили кредит/ })).toBeVisible();
});
