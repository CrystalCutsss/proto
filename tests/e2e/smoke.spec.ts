import { expect, test } from '@playwright/test';

test('main lists prototype cards without search or filters', async ({ page }) => {
  const registry = await (await page.request.get('/registry.json')).json();
  const visible = registry.prototypes.filter((p: { status: string }) => p.status !== 'archived');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proto Stand B2B Loans');
  await expect(page.locator('.hub-card')).toHaveCount(visible.length);
  await expect(page.locator('input, select')).toHaveCount(0);
  const card = page.locator('.hub-card', { hasText: 'Единая активация' });
  await expect(card.locator('.hub-card-meta')).toContainText('PWA');
  await expect(card.getByRole('link', { name: 'Открыть' })).toHaveAttribute('href', '/p/credit-activation/');
});

test('Changelog opens a full-screen dialog over main; Esc and Back close it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Changelog: Демо базовый' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Демо базовый' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/#changelog=demo-basic$/);
  expect(await dialog.evaluate((el) => [el.clientWidth, el.clientHeight])).toEqual([1280, 800]);
  await expect(dialog.locator('.hub-version h3')).toHaveText([/^v2/, /^v1/]);
  await expect(dialog.getByRole('link', { name: 'Открыть v1' })).toHaveAttribute(
    'href',
    '/p/demo-basic/?v=v1',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/#changelog/);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await page.goto('/#changelog=credit-activation');
  await expect(page.getByRole('dialog', { name: 'Единая активация' })).toBeVisible();
});

test('a version opened directly moves to the viewer, keeping version and screen', async ({ page }) => {
  await page.goto('/p/demo-basic/v1/#/details');
  await expect(page).toHaveURL(/\/p\/demo-basic\/\?v=v1&s=main#\/details$/);
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Подробности');
  const res = await page.request.get('/p/demo-basic/latest/', { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()['location']).toBe('/p/demo-basic/v2/');
});

test('desktop prototypes fill the window; the menu switches versions keeping known screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/p/demo-basic/');
  // demo-basic: v1 frozen, v2 review → "latest" resolves to v2.
  await expect(page).toHaveURL(/\?v=v2&s=main$/);
  const frame = page.locator('iframe');
  expect(await frame.boundingBox()).toEqual({ x: 0, y: 0, width: 1280, height: 800 });
  await expect(page.locator('.viewer-bezel')).toHaveCount(0);

  const version = page.getByRole('radiogroup', { name: 'Версия' });
  await expect(page.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio')).toHaveText([
    'Основной',
  ]);
  await page.frameLocator('iframe').getByRole('link', { name: 'Детали' }).click();
  await expect(page).toHaveURL(/#\/details$/);
  await version.getByRole('radio', { name: 'v1' }).click();
  await expect(page).toHaveURL(/\?v=v1&s=main#\/details$/);
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Подробности');

  await page.goto('/p/demo-basic/?v=v2#/settings');
  await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Настройки');
  await version.getByRole('radio', { name: 'v1' }).click();
  await expect(page).toHaveURL(/\?v=v1&s=main$/);
});

test('mobile prototypes sit in the iPhone mockup with their status bar on a wide screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/p/credit-activation/?v=v1');
  // The stage keeps its black but not the glow behind the mockup.
  expect(await page.evaluate(() => getComputedStyle(document.body, '::before').content)).toBe('none');
  const bezel = page.locator('img.viewer-bezel');
  await expect(bezel).toBeVisible();
  await expect.poll(() => bezel.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(1490);
  const app = page.frameLocator('iframe');
  await expect(app.locator('.status-bar').first()).toBeVisible();
  expect(await page.locator('iframe').evaluate((el) => [el.clientWidth, el.clientHeight])).toEqual([
    375, 812,
  ]);

  const scenario = page.getByRole('radiogroup', { name: 'Сценарий' });
  await scenario.getByRole('radio', { name: 'Успех' }).click();
  await expect(page).toHaveURL(/\?v=v1&s=success#\/success$/);
});

test('a version with menu axes shows one captioned control per axis instead of scenario and version', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/p/credit-activation/?v=v2');
  await expect(page).toHaveURL(/\?v=v2&product=kn&pledge=auto&docs=one$/);
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  await expect(menu.locator('.proto-menu-caption')).toHaveText(['Сценарий', 'Залог', 'Документы']);
  await expect(page.getByRole('radiogroup', { name: 'Версия' })).toHaveCount(0);
  await expect(page.getByRole('radiogroup', { name: 'Залог' }).getByRole('radio')).toHaveText([
    'Авто',
    'Недвижимость',
    '2 залога',
  ]);

  await page.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio', { name: 'ОК' }).click();
  await expect(page).toHaveURL(/\?v=v2&product=ok&pledge=auto&docs=one$/);
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    /\/p\/credit-activation\/v2\/\?product=ok&pledge=auto&docs=one$/,
  );
  await page.getByRole('radiogroup', { name: 'Документы' }).getByRole('radio', { name: '2 дока' }).click();
  await expect(page).toHaveURL(/product=ok&pledge=auto&docs=two$/);

  // A version opened directly keeps its axis values on the way to the viewer.
  await page.goto('/p/credit-activation/v2/?pledge=both#/options');
  await expect(page).toHaveURL(/\?v=v2&product=kn&pledge=both&docs=one#\/options$/);
  await expect(
    page.getByRole('radiogroup', { name: 'Залог' }).getByRole('radio', { name: '2 залога' }),
  ).toHaveAttribute('aria-checked', 'true');
});

test('on a phone screen the prototype fills it, without design bars or the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/credit-activation/');
  await expect(page.locator('img.viewer-bezel')).toHaveCount(0);
  const app = page.frameLocator('iframe');
  await expect(app.locator('html')).toHaveAttribute('data-proto-bars', 'hidden');
  await expect(app.locator('.top-bars').first()).toBeVisible();
  await expect(app.locator('.status-bar').first()).toBeHidden();
  await expect(app.locator('.home-indicator').first()).toBeHidden();
  // Mobile browsers get no menu: the prototype keeps the whole screen, in portrait and landscape.
  await expect(page.getByRole('navigation', { name: 'Сценарий и версия' })).toBeHidden();
  expect(await page.locator('iframe').boundingBox()).toEqual({ x: 0, y: 0, width: 390, height: 844 });
});

test.describe('a phone in landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('still counts as a mobile browser: full screen, no menu', async ({ page }) => {
    await page.goto('/p/credit-activation/');
    await expect(page.frameLocator('iframe').locator('html')).toHaveAttribute('data-proto-bars', 'hidden');
    await expect(page.locator('img.viewer-bezel')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Сценарий и версия' })).toBeHidden();
  });
});

test('on a phone the desktop prototype has no menu either', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/demo-basic/');
  await expect(page.frameLocator('iframe').locator('h1')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Сценарий и версия' })).toBeHidden();
});

test('an installed web app hides the design bars; the menu is collapsible on tablets, absent on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/credit-activation/v1/?proto-display=standalone#/');
  await expect(page.locator('html')).toHaveAttribute('data-proto-display', 'standalone');
  await expect(page.locator('.status-bar').first()).toBeHidden();
  await expect(page.locator('proto-shell')).toBeAttached();
  await expect(page.getByRole('navigation', { name: 'Сценарий и версия' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Показать меню сценария и версии' })).toBeHidden();

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/p/credit-activation/v1/?proto-display=standalone#/');
  await expect(page).toHaveURL(/\/p\/credit-activation\/v1\//);
  await expect(page.locator('html')).toHaveAttribute('data-proto-display', 'standalone');
  await expect(page.locator('.status-bar').first()).toBeHidden();
  const version = page.getByRole('radiogroup', { name: 'Версия' });
  await expect(version.getByRole('radio', { name: 'v1' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio', { name: 'Условия' }).click();
  await expect(page).toHaveURL(/\/v1\/\?proto-display=standalone&s=conditions#\/conditions$/);
  await page.getByRole('button', { name: 'Свернуть меню' }).click();
  await expect(version).toBeHidden();
  await page.getByRole('button', { name: 'Показать меню сценария и версии' }).click();
  await expect(version).toBeVisible();
});

test('?shell=0 keeps the bare version page and Alt+Shift+H hides the menu', async ({ page }) => {
  await page.goto('/p/demo-basic/v2/?shell=0');
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/p\/demo-basic\/v2\/\?shell=0$/);

  await page.goto('/p/demo-basic/');
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect(menu).toBeHidden();
  await page.reload();
  await expect(page.locator('iframe')).toBeAttached();
  await expect(menu).toBeHidden();
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

test('versions ship a web app manifest and home-screen icons (ADR-0019)', async ({ page }) => {
  await page.goto('/p/credit-activation/v1/?shell=0#/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/p/credit-activation/v1/manifest.webmanifest');
  const res = await page.request.get(href ?? '');
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const manifest = await res.json();
  expect(manifest).toMatchObject({
    start_url: '/p/credit-activation/v1/',
    scope: '/',
    display: 'standalone',
  });
  const icon = await page.request.get(
    (await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')) ?? '',
  );
  expect(icon.headers()['content-type']).toBe('image/png');
});
