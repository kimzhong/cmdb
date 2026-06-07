# CMDB 测试目录

本目录包含 CMDB 项目的端到端（E2E）测试脚本，覆盖前后端核心 CRUD 流程。

## 文件清单

| 文件 | 类型 | 覆盖范围 | 状态 |
|------|------|----------|------|
| `e2e_api.sh` | Bash + curl + Python | 后端 8 个页面 86 个 API 用例 | ✅ 86/86 |
| `e2e_frontend.js` | Node + playwright-core + Chrome | 前端 8 个页面 26 个真实浏览器用例 | ✅ 26/26 |

## 前置条件

1. MongoDB 在 `localhost:27017` 运行
2. 后端在 `localhost:8081` 运行（`go run cmd/server/main.go`）
3. 前端在 `localhost:3000` 运行（`cd web && npm run serve`）
4. 已创建 `admin / admin123` 用户（首次运行需执行下方"初始化"命令）
5. Chrome 浏览器安装于 `C:\Program Files\Google\Chrome\Application\chrome.exe`（仅 frontend 测试需要）
6. Node.js 18+ 与 `playwright-core` 已安装（`cd web && npm install` 已包含）

## 初始化

```bash
# 创建 admin 用户（仅首次需要）
python -c "
import pymongo,bcrypt
from datetime import datetime,timezone
db=pymongo.MongoClient('mongodb://localhost:27017/')['cmdb']
db.users.delete_many({})
db.users.insert_one({
    'username':'admin',
    'password':bcrypt.hashpw(b'admin123',bcrypt.gensalt()).decode(),
    'role':'admin','status':1,'source':'local',
    'create_at':datetime.now(timezone.utc),
    'modify_at':datetime.now(timezone.utc)
})"
```

## 运行

### 后端 API E2E（86 用例，约 30 秒）

```bash
bash tests/e2e_api.sh
```

测试覆盖（按页面）：
- **Login**：1 用例
- **Dashboard**：1 用例
- **Model**（模型/分组/字段/关系）：21 用例
- **Resource**（CRUD/批量/关系）：13 用例
- **Tag**（键/值/绑定/搜索）：13 用例
- **Search**（全局/ReDoS 防御）：5 用例
- **App**（业务/应用/绑定）：13 用例
- **Task**（同步任务/执行）：7 用例
- **边界与安全**（401/CORS）：3 用例
- **清理**：3 用例

特点：
- 自动清空测试数据（确保幂等）
- 每次运行使用纳秒级时间戳作为唯一标识
- 同时验证 review 修复（globalSearch ReDoS、batchDelete invalid_ids、bindAppResource `$addToSet on null` 等）
- 失败时输出响应体便于排查

### 前端 E2E（26 用例，约 60 秒）

```bash
node tests/e2e_frontend.js
```

测试覆盖（按页面）：
- **Login**：1 用例（admin/admin123 → 跳 dashboard）
- **Dashboard**：1 用例（统计渲染）
- **Model**：8 用例（创建分组→列表→创建模型→编辑→删除）
- **Resource**：3 用例（mount 稳定性 + API 联通 + 表格）
- **Tag**：4 用例（创建键→表格列内容→创建值→删除）
- **Search**：3 用例（普通搜索 + ReDoS 防御 + 正则元字符）
- **App**：3 用例（创建业务→树显示→创建应用）
- **Task**：1 用例（提交必填校验）
- **路由守卫**：2 用例（未登录跳 /login + /resource query 边界）

特点：
- 真实 Chrome headless 浏览器驱动
- 通过 ant-design `message` 组件捕获后端响应
- 通过 `:visible` 过滤器避免多 modal 重叠问题
- 失败时自动截图保存到 `C:/Users/kim/AppData/Local/Temp/cmdb_e2e_*.png`

## 完整测试金字塔

```
  26 ── E2E Frontend  (tests/e2e_frontend.js, 真实 Chrome)
  86 ── E2E API       (tests/e2e_api.sh, HTTP curl)
  31 ── 前端单元       (cd web && npm test, Vitest + happy-dom)
  19 ── 后端          (go test ./... 含 4 集成 build tag)
───── 162 测试用例 — 全过 ─────
```

## 在 CI 中运行

```yaml
# .github/workflows/e2e.yml 示例
- name: Start MongoDB
  uses: supercharge/mongodb-github-action@1.8.0

- name: Start backend
  run: go run cmd/server/main.go &

- name: Start frontend
  run: cd web && npm run serve &

- name: Init admin user
  run: python scripts/init_admin.py

- name: Backend E2E
  run: bash tests/e2e_api.sh

- name: Frontend E2E
  run: node tests/e2e_frontend.js
```

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| `Login failed: User not found` | admin 用户未创建 | 运行上方"初始化"命令 |
| `connect ECONNREFUSED 27017` | MongoDB 未启动 | 启动 mongod 或用 Docker |
| `chromium failed to launch` | Chrome 路径不对 | 确认 `C:\Program Files\Google\Chrome\Application\chrome.exe` 存在 |
| `Timeout 8000ms exceeded` | dev server 编译慢 | 首次启动后等待 30 秒再跑 |
| `Cannot read properties of undefined (reading 'query')` | 历史 bug 已修复 | 重新拉代码或确认 `web/src/views/Resource.vue:546` 在 setup 顶层调用 `useRoute()` |

## 添加新测试

新增页面或功能时，请同步：
1. **后端**：
   - 在 `e2e_api.sh` 追加对应 API 的 `call` + `expect` 块
2. **前端**：
   - 在 `e2e_frontend.js` 添加页面级 `describe` 块，覆盖：导航 → 创建 → 列表显示 → 编辑 → 删除
3. **单元**：
   - 后端：`internal/<pkg>/<feature>_test.go`
   - 前端：`web/src/<area>/__tests__/<feature>.spec.js`
