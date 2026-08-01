/**
 * Playwright 录屏脚本
 * 用法：node scripts/record-demo.cjs
 * 产出：demo/cmdb-demo.webm（可被 ffmpeg 转 mp4）
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUTPUT = path.resolve(__dirname, '..', 'demo', 'cmdb-demo.webm');
const BASE = 'http://localhost:5173';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: path.dirname(OUTPUT),
      size: { width: 1440, height: 900 },
    },
  });
  const page = await context.newPage();

  console.log('▶ Login');
  // 1. 打开登录页（先停几秒录一下）
  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await sleep(2500);
  // 截一张登录页的图作为视觉证据
  await page.screenshot({ path: path.join(path.dirname(OUTPUT), '_login-frame.png'), fullPage: false });
  // 2. 等按钮可点
  await page.waitForSelector('button.ant-btn.ant-btn-primary', { timeout: 10_000 });
  // 3. 故意停 1s 让录屏捕捉到登录页静止状态
  await sleep(1000);
  // 4. 点登录
  await page.click('button.ant-btn.ant-btn-primary');
  // 5. 等跳到首页
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  // 6. 截登录后第一帧
  await page.screenshot({ path: path.join(path.dirname(OUTPUT), '_home-frame.png'), fullPage: false });
  await sleep(2500);

  const steps = [
    ['/meta-model/categories', 2500, '分类'],
    ['/meta-model/groups', 2000, '模型分组'],
    ['/meta-model/models', 3000, '模型（点开抽屉）'],
    ['/resources', 3000, '资源仓库'],
    ['/tags', 2500, '标签管理'],
    ['/apps', 3000, '应用视图'],
    ['/search', 3000, '全局搜索（输入关键字）'],
    ['/sync', 2500, '定时任务'],
    ['/audit', 2500, '审计日志'],
    ['/health', 2000, '健康检查'],
  ];

  for (const [path, ms, label] of steps) {
    console.log(`▶ ${label}`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (path === '/meta-model/models') {
      // 点开第一个模型的详情
      try {
        await page.click('a:has-text("详情")', { timeout: 2000 });
        await sleep(1500);
      } catch {}
    }
    if (path === '/search') {
      try {
        await page.fill('input[placeholder*="关键字"]', '阿里云');
        await sleep(2000);
      } catch {}
    }
    if (path === '/sync') {
      // 切到日志 tab
      try {
        await page.click('div[role="tab"]:has-text("执行日志")', { timeout: 2000 });
        await sleep(1500);
      } catch {}
    }
    await sleep(ms);
  }

  await context.close();
  await browser.close();

  // Playwright 录出来的 video 文件名是 page@<hash>.webm，挑出非空的 rename 到目标
  const dir = path.dirname(OUTPUT);
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('page@') && f.endsWith('.webm'))
    .map((f) => ({ name: f, size: fs.statSync(path.join(dir, f)).size }))
    .sort((a, b) => b.size - a.size);
  if (files.length > 0) {
    fs.renameSync(path.join(dir, files[0].name), OUTPUT);
    // 删其余
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('page@') && f.endsWith('.webm')) {
        try { fs.unlinkSync(path.join(dir, f)); } catch {}
      }
    }
  }
  const stat = fs.statSync(OUTPUT);
  console.log(`✅ 录制完成: ${OUTPUT} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
