const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const res = await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 90000 });
  console.log('status', res && res.status());
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/landing-hero.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 850));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/landing-mid.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/opt/cursor/artifacts/screenshots/landing-footer.png', fullPage: false });
  console.log('ok');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
