// 验证：截 login 页面 + 截登录后首页
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..', 'demo', '_verify');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => console.log('  [browser]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  // 1. 登录页
  await page.goto('http://localhost:5173/login', { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '1-login.png'), fullPage: true });
  console.log('✓ 1-login.png');

  // 2. 点击登录
  await page.click('button.ant-btn.ant-btn-primary');
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT, '2-after-click.png'), fullPage: true });
  console.log('  url after click:', page.url());
  const html2 = await page.content();
  const buttons2 = await page.$$eval('button', (els) => els.map((b) => b.textContent?.trim()).filter(Boolean));
  const headings2 = await page.$$eval('h1,h2,h3,h4', (els) => els.map((e) => e.textContent?.trim()).filter(Boolean));
  console.log('  buttons:', JSON.stringify(buttons2).slice(0, 200));
  console.log('  headings:', JSON.stringify(headings2).slice(0, 200));
  console.log('  html length:', html2.length);
  console.log('  body text:', (await page.evaluate(() => document.body.innerText)).slice(0, 500));
  console.log('✓ 2-after-click.png');

  // 3. 跳到资源页（看真登录后是不是能进）
  await page.goto('http://localhost:5173/resources', { waitUntil: 'networkidle' });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT, '3-resources.png'), fullPage: true });
  console.log('  url:', page.url());
  console.log('✓ 3-resources.png');

  await browser.close();
})();
