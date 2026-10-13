// Hub card previews: screenshot of each prototype's default version, taken with the pre-installed Chromium
// (Playwright 1.56.1, ADR-0005). Skipped with a notice when no browser is available.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createSiteServer, listen } from './server.mjs';

/**
 * @param {string} out dist/site
 * @param {import('@proto/registry').Registry} registry mutated: prototypes get `preview`
 * @returns {Promise<{ taken: number, skipped?: string }>}
 */
export async function takePreviews(out, registry) {
  if (registry.prototypes.length === 0) return { taken: 0 };
  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    return { taken: 0, skipped: '@playwright/test is not installed' };
  }
  if (!existsSync(chromium.executablePath()))
    return { taken: 0, skipped: `no browser at ${chromium.executablePath()}` };

  const server = createSiteServer(out);
  const base = await listen(server);
  const browser = await chromium.launch();
  let taken = 0;
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce',
    });
    for (const p of registry.prototypes) {
      const page = await context.newPage();
      try {
        await page.goto(`${base}/p/${p.slug}/${p.defaultVersion}/?shell=0`, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });
        await page.waitForTimeout(500);
        mkdirSync(join(out, '_previews'), { recursive: true });
        await page.screenshot({ path: join(out, '_previews', `${p.slug}.jpg`), type: 'jpeg', quality: 70 });
        p.preview = `/_previews/${p.slug}.jpg`;
        taken += 1;
      } catch (err) {
        console.warn(`preview: ${p.slug} failed: ${/** @type {Error} */ (err).message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  return { taken };
}
