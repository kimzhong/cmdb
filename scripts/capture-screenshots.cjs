/**
 * 为 readme.md 生成 11 张功能截图
 * 用法：node scripts/capture-screenshots.cjs
 * 产物：demo/screenshots/{01..11}-*.png
 *
 * 关键点：
 *  1. 走真实 /api/auth/login 拿 JWT（不是假的 demo-token，避免 401）
 *  2. 用 addInitScript 在每个 page 加载前就把 token 写到 localStorage，
 *     这样 zustand store 同步初始化时就能读到 token，AuthGuard 放行
 *  3. 每张图都用 waitForSelector 等到该页特有元素再截图
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '..', 'docs', 'screenshots');
const BASE = 'http://localhost:5173';
const API = 'http://127.0.0.1:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const steps = [
  { file: '01-login.png',          path: '/login',                 label: '登录页',                 ready: 'input[placeholder*="用户名"], input[type="text"]' },
  { file: '02-dashboard.png',      path: '/dashboard',             label: '仪表盘',                 ready: 'text=仪表盘' },
  { file: '03-relations.png',      path: '/relations',             label: '关系管理',               ready: 'text=关系管理' },
  { file: '04-approvals.png',      path: '/approvals',             label: '审批工单',               ready: 'text=审批工单' },
  { file: '05-trash.png',          path: '/trash',                 label: '回收站',                 ready: 'text=回收站' },
  { file: '06-ipam.png',           path: '/ipam',                  label: 'IPAM 子网',              ready: 'text=IPAM' },
  { file: '07-discovery.png',      path: '/discovery',             label: '自动发现',               ready: 'text=自动发现' },
  { file: '08-bulk-io.png',        path: '/bulk-io',               label: '批量导入导出',           ready: 'text=批量导入导出' },
  { file: '09-templates.png',      path: '/model-templates',      label: '预置模型库',             ready: 'text=预置模型库' },
  { file: '10-rooms.png',          path: '/rooms',                 label: '机房拓扑',               ready: 'text=机房' },
  { file: '11-models.png',         path: '/meta-model/models',     label: '元模型（v0.1）',         ready: 'text=模型' },
  { file: '12-resources.png',      path: '/resources',             label: '资源仓库（v0.1）',       ready: 'text=资源仓库' },
];

async function getRealToken() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  const body = await res.json();
  if (body.code !== 0) throw new Error(`login failed: ${body.message}`);
  return body.data.access_token || body.data.token;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // 先拿真实 token
  const token = await getRealToken();
  console.log(`✅ 拿到 token (前 30 字符): ${token.slice(0, 30)}...`);

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // 每个 page 加载前同步把 token 写进 localStorage
  const initToken = (tok) => {
    try {
      localStorage.setItem('cmdb.token', tok);
    } catch (e) {
      /* ignore */
    }
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`▶ [${i + 1}/${steps.length}] ${step.label} -> ${step.file}`);

    // 登录页用干净 context（不带 token）
    if (i === 0) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}${step.path}`, { waitUntil: 'load' });
      // 等到登录表单出现
      await page.waitForSelector(step.ready, { timeout: 10000 }).catch(() => {});
      await sleep(800);
      await page.screenshot({ path: path.join(OUT, step.file), fullPage: false });
      await ctx.close();
      continue;
    }

    // 其他页用带 token 的 context
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript({ content: `(${initToken.toString()})(${JSON.stringify(token)});` });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${step.path}`, { waitUntil: 'load' });
    // 等待该页特有的标题/元素出现
    try {
      await page.waitForSelector(step.ready, { timeout: 8000 });
    } catch (e) {
      console.log(`   ⚠️  未找到 ${step.ready}，尝试 waitForLoadState networkidle`);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    }
    // 额外等 API 数据回到
    await sleep(1500);

    // 特殊页面微操
    if (step.path === '/search') {
      try {
        await page.fill('input[placeholder*="关键字"], input[placeholder*="搜索"]', '阿里云');
        await sleep(1500);
      } catch {}
    }
    if (step.path === '/sync') {
      try {
        await page.click('div[role="tab"]:has-text("执行日志")', { timeout: 2000 });
        await sleep(1500);
      } catch {}
    }
    if (step.path === '/audit') {
      try {
        await page.click('div[role="tab"]:has-text("查询")', { timeout: 2000 });
        await sleep(1500);
      } catch {}
    }

    await page.screenshot({ path: path.join(OUT, step.file), fullPage: false });
    await ctx.close();
  }

  await browser.close();
  console.log(`\n✅ ${steps.length} 张截图已存到 ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
