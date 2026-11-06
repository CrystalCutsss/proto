// Login flow of the hosting Worker, served locally through the same handler (ADR-0015).
import { expect, test } from '@playwright/test';
import { AUTH_PASSWORD, authPort } from '../../playwright.config';

test.use({ baseURL: `http://127.0.0.1:${authPort}` });

test('a deep link asks for the password and returns to the same page', async ({ page }) => {
  await page.goto('/p/demo-basic/v2/#/details');
  await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
  await page.getByLabel('Пароль').fill('wrong');
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('alert')).toHaveText('Неверный пароль.');

  await page.getByLabel('Пароль').fill(AUTH_PASSWORD);
  await page.getByRole('button', { name: 'Войти' }).click();
  // Back on the version, which moves into the viewer with its menu button.
  await expect(page).toHaveURL(/\/p\/demo-basic\/\?v=v2&s=main$/);
  await page.getByRole('button', { name: 'Меню прототипа' }).click();
  await expect(page.getByRole('navigation', { name: 'Сценарий и версия' })).toBeVisible();

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name === 'proto_session');
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe('Lax');

  const registry = await (await page.request.get('/registry.json')).json();
  await page.goto('/');
  await expect(page.locator('.hub-card')).toHaveCount(registry.prototypes.length);
});

test('without a session nothing but the login page and robots.txt is served', async ({ request }) => {
  for (const path of ['/', '/registry.json', '/_shell/shell.js', '/p/demo-basic/', '/p/demo-basic/v1/']) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(401);
  }
  expect((await request.get('/robots.txt')).status()).toBe(200);
});
