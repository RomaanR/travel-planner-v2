import { chromium, devices } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';

const iPhone = devices['iPhone 14'];
const BASE   = 'http://localhost:3000';
const OUT    = 'scripts/mobile-screenshots';

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ ...iPhone, locale: 'en-US' });
const page    = await ctx.newPage();

// Dismiss cookie banner helper
async function dismissBanner() {
  try {
    const btn = page.locator('text=ACCEPT ALL');
    if (await btn.isVisible({ timeout: 1500 })) await btn.click();
  } catch {}
}

const pages = [
  { name: '01-home',    url: '/' },
  { name: '02-curate',  url: '/curate' },
  { name: '03-pricing', url: '/pricing' },
  { name: '04-sample',  url: '/sample' },
  { name: '05-trips',   url: '/trips' },
  { name: '06-faq',     url: '/faq' },
  { name: '07-privacy', url: '/privacy' },
];

for (const { name, url } of pages) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await dismissBanner();
  await page.waitForTimeout(600); // let framer motion settle

  // Full-page screenshot
  await page.screenshot({
    path: path.join(OUT, `${name}-full.png`),
    fullPage: true,
  });

  // Above-the-fold screenshot
  await page.screenshot({
    path: path.join(OUT, `${name}-fold.png`),
    fullPage: false,
  });

  console.log(`✓ ${name}`);
}

// Mobile menu open state
await page.goto(BASE, { waitUntil: 'networkidle' });
await dismissBanner();
const hamburger = page.locator('button[aria-label="Open menu"], button.md\\:hidden').first();
try {
  await hamburger.click({ timeout: 3000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '08-mobile-menu-open.png'), fullPage: false });
  console.log('✓ 08-mobile-menu-open');
} catch {
  console.log('⚠ Could not open mobile menu — skipping');
}

// Scroll-down on home to check below-fold sections
await page.goto(BASE, { waitUntil: 'networkidle' });
await dismissBanner();
await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, '09-home-below-fold.png'), fullPage: false });
console.log('✓ 09-home-below-fold');

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, '10-home-footer.png'), fullPage: false });
console.log('✓ 10-home-footer');

// Curate form interaction — trigger stage expansion
await page.goto(BASE + '/curate', { waitUntil: 'networkidle' });
await dismissBanner();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, '11-curate-form-top.png'), fullPage: false });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, '12-curate-form-bottom.png'), fullPage: false });
console.log('✓ 11-12-curate-form');

await browser.close();
console.log('\nDone — screenshots saved to', OUT);
