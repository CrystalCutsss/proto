import { expect, test, type Page } from '@playwright/test';

/** The viewer menu starts collapsed: open it with the floating button (ADR-0026). */
const openMenu = (page: Page) => page.getByRole('button', { name: 'Меню прототипа' }).click();

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

  // The menu starts collapsed; the button in the bottom-right corner opens it in one row and closes it again.
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  const toggle = page.getByRole('button', { name: 'Меню прототипа' });
  await expect(menu).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const corner = (await toggle.boundingBox())!;
  expect(1280 - corner.x - corner.width).toBeLessThanOrEqual(24);
  expect(800 - corner.y - corner.height).toBeLessThanOrEqual(24);
  await toggle.click();
  await expect(menu).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(menu).toBeHidden();
  await toggle.click();

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
  await openMenu(page);
  await version.getByRole('radio', { name: 'v1' }).click();
  await expect(page).toHaveURL(/\?v=v1&s=main$/);
});

test("the menu button stacks above the prototype's own button in its corner (Tadum «Demo»)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const toggle = page.getByRole('button', { name: 'Меню прототипа' });
  // English: Tadum's «Demo» sits in the bottom-right corner; the menu button moves above it, aligned and apart.
  await page.goto('/p/tadum/?lang=en');
  const demo = page.frameLocator('iframe').getByRole('button', { name: 'Demo' });
  await expect(demo).toBeVisible();
  await expect
    .poll(async () => {
      const [t, d] = [(await toggle.boundingBox())!, (await demo.boundingBox())!];
      return t.y + t.height <= d.y && d.y - (t.y + t.height) <= 16;
    })
    .toBe(true);
  await toggle.click();
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  const [m, d] = [(await menu.boundingBox())!, (await demo.boundingBox())!];
  expect(m.y + m.height).toBeLessThanOrEqual(d.y);
  // Arabic: «Demo» is in the bottom-left corner, the menu button stays in its own.
  await page.goto('/p/tadum/?lang=ar');
  await expect(page.frameLocator('iframe').locator('[dir="rtl"]').first()).toBeAttached();
  await expect.poll(async () => 900 - ((await toggle.boundingBox())!.y + 48)).toBe(16);
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

  await openMenu(page);
  const scenario = page.getByRole('radiogroup', { name: 'Сценарий' });
  await scenario.getByRole('radio', { name: 'Успех' }).click();
  await expect(page).toHaveURL(/\?v=v1&s=success#\/success$/);
});

test('a version with menu axes shows one captioned control per axis and the version instead of scenario', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/p/credit-activation/?v=v2');
  await expect(page).toHaveURL(/\?v=v2&product=kn&pledge=auto&docs=one$/);
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  await openMenu(page);
  await expect(menu.locator('.proto-menu-caption')).toHaveText(['Сценарий', 'Залог', 'Документы', 'Версия']);
  // All controls in one row.
  const tops = await menu
    .locator('ds-segmented')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom));
  expect(new Set(tops).size).toBe(1);
  await expect(page.getByRole('radiogroup', { name: 'Версия' }).getByRole('radio')).toHaveText([
    'v1',
    'v2',
    'v3',
    'v4',
  ]);
  await expect(page.getByRole('radiogroup', { name: 'Залог' }).getByRole('radio')).toHaveText([
    'Авто',
    'Недвижимость',
    '2 залога',
  ]);

  const historyLength = await page.evaluate(() => history.length);
  await page.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio', { name: 'ОК' }).click();
  await expect(page).toHaveURL(/\?v=v2&product=ok&pledge=auto&docs=one$/);
  const frameUrl = () =>
    page.locator('iframe').evaluate((el) => (el as HTMLIFrameElement).contentWindow!.location.href);
  await expect.poll(frameUrl).toMatch(/\/p\/credit-activation\/v2\/\?product=ok&pledge=auto&docs=one(#\/)?$/);
  await page.getByRole('radiogroup', { name: 'Документы' }).getByRole('radio', { name: '2 дока' }).click();
  await expect(page).toHaveURL(/product=ok&pledge=auto&docs=two$/);
  // A choice replaces the iframe's document instead of adding history entries with the old axes.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  // A later version without axes shows them greyed out with the last choice; going back restores it (ADR-0024).
  await page.getByRole('radiogroup', { name: 'Версия' }).getByRole('radio', { name: 'v3' }).click();
  await expect(page).toHaveURL(/\?v=v3&s=main&product=ok&pledge=auto&docs=two$/);
  await expect.poll(frameUrl).toMatch(/\/p\/credit-activation\/v3\/(#\/)?$/);
  const product = page.getByRole('radiogroup', { name: 'Сценарий' });
  await expect(product).toHaveAttribute('aria-disabled', 'true');
  await expect(product.getByRole('radio', { name: 'ОК' })).toHaveAttribute('aria-checked', 'true');
  await expect(product.getByRole('radio', { name: 'КН' })).toBeDisabled();
  // A reload keeps the greyed-out choice.
  await page.reload();
  await openMenu(page);
  await expect(product.getByRole('radio', { name: 'ОК' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radiogroup', { name: 'Версия' }).getByRole('radio', { name: 'v2' }).click();
  await expect(page).toHaveURL(/\?v=v2&product=ok&pledge=auto&docs=two$/);
  await expect(product).not.toHaveAttribute('aria-disabled');

  // A version opened directly keeps its axis values on the way to the viewer.
  await page.goto('/p/credit-activation/v2/?pledge=both#/options');
  await expect(page).toHaveURL(/\?v=v2&product=kn&pledge=both&docs=one#\/options$/);
  await openMenu(page);
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

test('on a phone a version with menu axes gets a floating variants button and sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/credit-activation/?v=v2');
  const fab = page.getByRole('button', { name: 'Варианты прототипа' });
  await expect(fab).toBeVisible();
  const box = (await fab.boundingBox())!;
  expect(box.x + box.width).toBeGreaterThan(390 - 32);
  expect(box.y + box.height).toBeGreaterThan(844 / 2);
  await fab.click();
  const sheet = page.getByRole('dialog', { name: 'Варианты' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.proto-menu-caption')).toHaveText(['Сценарий', 'Залог', 'Документы', 'Версия']);
  await sheet.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio', { name: 'ОК' }).click();
  await expect(page).toHaveURL(/\?v=v2&product=ok&pledge=auto&docs=one$/);
  // The sheet switches versions too; on v3 the axes stay greyed out there.
  await sheet.getByRole('radiogroup', { name: 'Версия' }).getByRole('radio', { name: 'v3' }).click();
  await expect(page).toHaveURL(/\?v=v3&s=main&product=ok&pledge=auto&docs=one$/);
  await expect(sheet.getByRole('radiogroup', { name: 'Сценарий' })).toHaveAttribute('aria-disabled', 'true');
  await sheet.getByRole('button', { name: 'Готово' }).click();
  await expect(sheet).toBeHidden();

  // Versions before any axes keep no button; wide screens keep the corner menu button instead.
  await page.goto('/p/credit-activation/?v=v1');
  await expect(page.locator('iframe')).toBeVisible();
  await expect(fab).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/p/credit-activation/?v=v2');
  await expect(fab).toBeHidden();
  await openMenu(page);
  await expect(page.getByRole('radiogroup', { name: 'Залог' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Меню прототипа' })).toBeHidden();

  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/p/credit-activation/v1/?proto-display=standalone#/');
  await expect(page).toHaveURL(/\/p\/credit-activation\/v1\//);
  await expect(page.locator('html')).toHaveAttribute('data-proto-display', 'standalone');
  await expect(page.locator('.status-bar').first()).toBeHidden();
  const version = page.getByRole('radiogroup', { name: 'Версия' });
  await expect(version).toBeHidden();
  await openMenu(page);
  await expect(version.getByRole('radio', { name: 'v1' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('radiogroup', { name: 'Сценарий' }).getByRole('radio', { name: 'Условия' }).click();
  await expect(page).toHaveURL(/\/v1\/\?proto-display=standalone&s=conditions#\/conditions$/);
  // The next page starts collapsed again; the button opens and closes the menu.
  await expect(version).toBeHidden();
  await openMenu(page);
  await expect(version).toBeVisible();
  await openMenu(page);
  await expect(version).toBeHidden();
});

test('?shell=0 keeps the bare version page and Alt+Shift+H toggles the menu', async ({ page }) => {
  await page.goto('/p/demo-basic/v2/?shell=0');
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/p\/demo-basic\/v2\/\?shell=0$/);

  await page.goto('/p/demo-basic/');
  const menu = page.getByRole('navigation', { name: 'Сценарий и версия' });
  await expect(page.locator('iframe')).toBeAttached();
  await expect(menu).toBeHidden();
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect(menu).toBeHidden();
  // Every page load starts with the menu collapsed.
  await page.keyboard.press('Alt+Shift+KeyH');
  await expect(menu).toBeVisible();
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

test('credit-activation v3: the heavy path through documents and the direct path to light conditions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/p/credit-activation/v3/?shell=0#/');
  const top = page.locator('section:not([inert])');
  const legal = top.getByText(/Нажимая «Получить деньги»/);

  // Heavy path: heavy → documents (+ upload) → light → review («Получить деньги») → success.
  await expect(top.getByRole('button', { name: /Увеличить лимит/ })).toContainText(
    'До 9\u00a0млн\u00a0₽ с\u00a0условиями',
  );
  await top.getByRole('button', { name: /Увеличить лимит/ }).click();
  await expect(page).toHaveURL(/#\/heavy$/);
  await expect(top.getByRole('heading', { name: 'Как хотите увеличить лимит' })).toBeVisible();
  await top.getByRole('checkbox', { name: /Оставить в залог авто/ }).click();
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/documents$/);
  await page.locator('[data-route="#/documents"]').getByRole('button', { name: 'Загрузить' }).first().click();
  await expect(page).toHaveURL(/#\/upload$/);
  await page.locator('[data-route="#/upload"]').getByRole('button', { name: 'Загрузить' }).click();
  await expect(page).toHaveURL(/#\/documents$/);
  // As in v2, the upload screen sends both documents at once.
  await expect(page.locator('[data-route="#/documents"]').getByText('Загружено')).toHaveCount(2);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/light$/);
  await expect(top.getByRole('heading', { name: 'Выберите улучшения условий' })).toBeVisible();
  // Both «Снизим комиссию» cards can be on, the cuts add up: 2,5 % with the pledge − 1 − 0,5 → 1,0 %.
  await top.locator('[data-choice="one"]').click();
  await top.locator('[data-choice="half"]').click();
  await expect(top.locator('[data-choice="one"]')).toHaveAttribute('aria-checked', 'true');
  await expect(top.locator('[data-choice="half"]')).toHaveAttribute('aria-checked', 'true');
  await expect(top.getByText('1,0%')).toBeVisible();
  // «Получить деньги» and its legal line are only on the review screen.
  await expect(top.getByRole('button', { name: 'Получить деньги' })).toHaveCount(0);
  await expect(legal).toHaveCount(0);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(top.getByText('Понадобится проверка')).toBeVisible();
  await expect(legal).toBeVisible();
  await top.getByRole('button', { name: 'Получить деньги' }).click();
  await expect(page).toHaveURL(/#\/success$/);
  await expect(top.getByRole('heading', { name: /Зачисляем/ })).toBeVisible();
  await top.getByRole('button', { name: 'К счету' }).click();
  await expect(page).toHaveURL(/#\/$/);

  // Direct path: light → review → success.
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/light$/);
  await expect(legal).toHaveCount(0);
  await top.getByRole('button', { name: 'Назад' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(legal).toBeVisible();
  await top.getByRole('button', { name: 'Получить деньги' }).click();
  await expect(page).toHaveURL(/#\/success$/);
  await top.getByRole('button', { name: 'К счету' }).click();
  await expect(page).toHaveURL(/#\/$/);

  // A deep link to the light conditions builds the long path: back goes to the documents.
  await page.goto('/p/credit-activation/v3/?shell=0#/light');
  await top.getByRole('button', { name: 'Назад' }).click();
  await expect(page).toHaveURL(/#\/documents$/);
});

test('credit-activation v4: КН goes through the packages and the documents, ОК straight to the review', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const top = page.locator('section:not([inert])');
  const legal = top.getByText(/Нажимая «Получить деньги»/);

  // КН: «Кредит» → «Варианты платежа» → «Выбрать» → documents → review with the tariff → success.
  await page.goto('/p/credit-activation/v4/?shell=0&product=kn#/');
  await top.getByRole('checkbox', { name: /Залог авто/ }).click();
  await expect(top.getByText('4 200 000 ₽')).toBeVisible();
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/tariffs$/);
  await expect(top.getByRole('heading', { name: 'Варианты платежа' })).toBeVisible();
  // The card's payment follows the amount (4,2 млн with the pledge) and the review shows the same value.
  await expect(top.getByRole('heading', { name: '18\u00a0599\u00a0₽/мес' })).toBeVisible();
  await top.getByRole('button', { name: 'Выбрать' }).first().click();
  await expect(page).toHaveURL(/#\/documents$/);
  await expect(legal).toHaveCount(0);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/review$/);
  // The tariff card says «Пакет «Универсальный»» too, so look on the review screen only.
  const review = page.locator('[data-route="#/review"]');
  await expect(review.getByText('Пакет «Универсальный»')).toBeVisible();
  await expect(top.getByText('18\u00a0598,70\u00a0₽')).toBeVisible();
  await expect(top.getByText('Комиссия', { exact: true })).toHaveCount(0);
  // The review ends the flow: no way back to the documents from here.
  await expect(legal).toBeVisible();
  await top.getByRole('button', { name: 'Получить деньги' }).click();
  await expect(page).toHaveURL(/#\/success$/);
  await top.getByRole('button', { name: 'К счету' }).click();
  await expect(page).toHaveURL(/#\/$/);

  // КН: a tap on the amount brings up the numeric input; an exact amount is kept within the limit.
  const amountInput = top.getByRole('textbox', { name: /Сумма кредита/ });
  // Outside a device the drawn iOS keyboard opens instead of the system one.
  await expect(amountInput).toHaveAttribute('inputmode', 'none');
  // A tap on the chevron lands on the input laid over the amount and the chevron.
  await expect(page.locator('.viewport')).not.toHaveClass(/is-busy/);
  await expect(page.locator('.page')).toHaveCount(1);
  const chevron = await top.locator('.amount-field__chevron').boundingBox();
  await page.mouse.click(chevron!.x + chevron!.width / 2, chevron!.y + chevron!.height / 2);
  await expect(amountInput).toBeFocused();
  await expect(page.locator('.keyboard')).toHaveClass(/is-open/);
  await amountInput.fill('2500000');
  await amountInput.press('Enter');
  await expect(top.locator('[data-amount]')).toHaveText('2 500 000 ₽');
  // The conditions still change a typed amount: the pledge adds its 200 000 ₽ and takes them away again.
  await top.getByRole('checkbox', { name: /Залог авто/ }).click();
  await expect(top.locator('[data-amount]')).toHaveText('2 700 000 ₽');
  await top.getByRole('checkbox', { name: /Залог авто/ }).click();
  await expect(top.locator('[data-amount]')).toHaveText('2 500 000 ₽');
  // At the floor: switching the pledge off would take the amount below 100 000 ₽, so it stops there with the toast
  // «Можем выдать не меньше 100 000 ₽».
  await top.getByRole('checkbox', { name: /Залог авто/ }).click();
  await amountInput.fill('150000');
  await amountInput.press('Enter');
  await expect(top.locator('[data-amount]')).toHaveText('150 000 ₽');
  await top.getByRole('checkbox', { name: /Залог авто/ }).click();
  await expect(top.locator('[data-amount]')).toHaveText('100 000 ₽');
  await expect(page.locator('.toast')).toContainText('Можем выдать не меньше 100\u00a0000\u00a0₽');
  // Above the limit: cut to it with the toast «Можем выдать не больше …».
  await amountInput.fill('9000000');
  await expect(page.locator('.toast')).toContainText('Можем выдать не больше 4\u00a0000\u00a0000\u00a0₽');
  await amountInput.press('Enter');
  await expect(top.locator('[data-amount]')).toHaveText('4 000 000 ₽');
  await expect(page.locator('.keyboard')).not.toHaveClass(/is-open/);

  // «До 4,5 млн ₽ с улучшением условий» → «Условия» (КН: no pledge card, it lives on «Кредит»): a tap on a card toggles it
  // and recalculates the header.
  await top.getByRole('button', { name: /улучшением условий/ }).click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await expect(top.getByRole('checkbox', { name: /залог/ })).toHaveCount(0);
  await top.getByRole('checkbox', { name: /Проверить данные/ }).click();
  await expect(top.getByRole('checkbox', { name: /Проверить данные/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(top.locator('[data-amount]')).toHaveText('4 100 000 ₽');
  // КН: «Дальше» on «Условия» opens «Тарифы»; «Ваши условия» → «Выбрать» then goes on to the documents.
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/tariffs$/);
  await top.getByRole('button', { name: 'Выбрать' }).last().click();
  await expect(page).toHaveURL(/#\/documents$/);

  // Through «Тарифы» first: «Ваши условия» opens «Условия», whose «Дальше» goes straight to the documents.
  await page.goto('/p/credit-activation/v4/?shell=0&product=kn#/');
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/tariffs$/);
  await top.getByRole('button', { name: 'Выбрать' }).last().click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/documents$/);

  // ОК: «Кредит» shows the fee and no pledge card; on «Условия» a lower fee lowers the payment and turns its chip
  // positive; «Дальше» on «Кредит» goes straight to the review, which shows the fee.
  await page.goto('/p/credit-activation/v4/?shell=0&product=ok#/');
  await expect(top.getByText('Комиссия', { exact: true })).toBeVisible();
  await expect(top.getByRole('checkbox', { name: /Залог авто/ })).toHaveCount(0);
  await expect(top.getByRole('textbox', { name: /Сумма кредита/ })).toBeVisible();
  await top.getByRole('button', { name: /улучшением условий/ }).click();
  await expect(top.getByRole('checkbox', { name: /Залог авто/ })).toBeVisible();
  await expect(top.getByText('Изменить')).toBeVisible();
  await top
    .getByRole('checkbox', { name: /Снизить комиссию/ })
    .first()
    .click();
  await expect(top.locator('[data-chip="payment"]')).toHaveAttribute('data-tone', 'positive');
  await top
    .getByRole('checkbox', { name: /Снизить комиссию/ })
    .first()
    .click();
  await top.getByRole('button', { name: 'Назад' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await top.getByRole('button', { name: 'Дальше' }).click();
  await expect(page).toHaveURL(/#\/review$/);
  await expect(top.getByText('Комиссия', { exact: true })).toBeVisible();
  await top.getByRole('button', { name: 'Получить деньги' }).click();
  await expect(page).toHaveURL(/#\/success$/);
});

test('credit-activation v4: the shared-header transition to the conditions and back leaves both screens clean', async ({
  page,
}) => {
  await page.goto('/p/credit-activation/v4/?shell=0#/');
  const top = page.locator('section:not([inert])');
  await top.getByRole('button', { name: /улучшением условий/ }).click();
  await expect(page).toHaveURL(/#\/conditions$/);
  await expect(page.locator('.viewport')).not.toHaveClass(/is-busy/);
  // After the push the conditions page is opaque again and its faded parts are fully shown.
  await expect(top).not.toHaveClass(/page--sharing/);
  await expect(top.locator('.wheel')).toHaveCSS('opacity', '1');
  await top.getByRole('button', { name: 'Назад' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('.viewport')).not.toHaveClass(/is-busy/);
  await expect(page.locator('.page')).toHaveCount(1);
  await expect(top.locator('[data-amount]')).toHaveCSS('opacity', '1');
  await expect(top.locator('.info-cards')).toHaveCSS('opacity', '1');
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
