const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('response', async (r) => { if (r.url().includes('/api/dashboard')) console.log('RESPONSE', r.status(), r.url()); });
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="tel"]').first().fill('+919999900099');
  await page.locator('input[type="password"]').first().fill('demo1234');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
  await page.goto('http://localhost:3001/operations', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/shot-10-operations-admin.png', fullPage: true });
  await browser.close();
})();
