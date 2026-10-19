import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('tmp/travalbee-audit');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const results = [];
for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, deviceScaleFactor: 1 });
  const page = await context.newPage();
  for (const route of ['/', '/curate', '/sample', '/pricing', '/trips']) {
    const errors = [];
    const onError = error => errors.push(error.message.slice(0, 350));
    page.on('pageerror', onError);
    const item = { route, viewport };
    try {
      const started = Date.now();
      const response = await page.goto('https://travalbee.com' + route, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2200);
      Object.assign(item, {
        status: response.status(), url: page.url(), title: await page.title(),
        elapsedMs: Date.now() - started,
        text: (await page.locator('body').innerText()).slice(0, 16000),
        layout: await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })),
        links: await page.locator('a').evaluateAll(nodes => nodes.map(node => ({ text: node.innerText, href: node.getAttribute('href') }))),
        fields: await page.locator('input,select,textarea').evaluateAll(nodes => nodes.map(node => ({ tag: node.tagName, type: node.type, placeholder: node.placeholder, required: node.required, label: node.getAttribute('aria-label'), id: node.id }))),
        errors,
      });
      const name = (route === '/' ? 'home' : route.slice(1)) + '-' + viewport.width;
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: false });
      item.screenshot = name + '.png';
    } catch (error) { item.error = error.message.slice(0, 1000); }
    results.push(item);
    await writeFile(path.join(out, 'public-inspection.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ route, viewport: viewport.width, status: item.status, title: item.title, layout: item.layout, error: item.error, errors: item.errors, text: item.text?.slice(0, 750) }));
    page.off('pageerror', onError);
  }
  await context.close();
}
const request = await browser.newContext();
for (const route of ['/robots.txt', '/sitemap.xml']) {
  try {
    const response = await request.request.get('https://travalbee.com' + route, {timeout: 12000});
    results.push({route, status:response.status(), text: (await response.text()).slice(0, 1000)});
    console.log(JSON.stringify({ route, status: response.status() }));
  } catch (error) { results.push({ route, error: error.message.slice(0, 500) }); }
}
await writeFile(path.join(out, 'public-inspection.json'), JSON.stringify(results, null, 2));
await browser.close();
