# CMDB 平台 · 开发者指南

> 基于二丫讲梵 CMDB 平台建设指南的 NestJS + React + MongoDB 全栈实现。
> 详细产品需求见 [readme.md](./readme.md)。

## 1. 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite 5 + React 18 + TypeScript + Ant Design 5 + React Query + Zustand + React Router 6 |
| 后端 | NestJS 10 + Mongoose 8 + @nestjs/schedule + class-validator + Swagger |
| 数据库 | MongoDB 7 |
| Monorepo | pnpm workspace + Turborepo |
| 鉴权 | JWT + 全局 JwtAuthGuard |
| 指标 | Prometheus (prom-client) |
| 容器化 | Docker + Docker Compose |

## 2. 仓库结构

```
cmdb/
├── apps/
│   ├── server/                # NestJS 后端
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/{filters,interceptors,decorators}
│   │   │   ├── config/
│   │   │   └── modules/
│   │   │       ├── health/
│   │   │       ├── meta-model/{categories,model-groups,models}
│   │   │       ├── resources/        # 动态 schema 工厂 + 资源 CRUD
│   │   │       ├── tags/             # 标签 K-V + 资源绑定
│   │   │       ├── search/           # 全局搜索
│   │   │       ├── apps/             # 业务 / 应用 / 资源关联
│   │   │       ├── sync/             # 定时任务 + CloudProvider
│   │   │       ├── auth/             # JWT 鉴权
│   │   │       ├── audit/            # 审计日志拦截器
│   │   │       └── metrics/          # Prometheus 指标
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                   # React 前端
│       ├── src/
│       │   ├── main.tsx
│       │   ├── router.tsx
│       │   ├── api/{auth,categories,modelGroups,models,resources,tags,search,apps,sync,audit,health}.ts
│       │   ├── hooks/
│       │   ├── pages/         # 11 个页面
│       │   ├── components/
│       │   ├── stores/
│       │   └── types/
│       └── package.json
├── packages/
│   └── shared/                # 前后端共享类型 (@cmdb/shared)
│       └── src/types/{api,meta-model,field}.ts
├── docker/
│   ├── mongo/init-mongo.js
│   ├── server.Dockerfile
│   └── web.Dockerfile
├── scripts/
│   └── record-demo.cjs        # Playwright 录屏
├── demo/                      # 录屏产物 (git ignored)
├── readme.md                  # 产品需求
├── package.json               # 根
├── pnpm-workspace.yaml
├── turbo.json
├── eslint.config.mjs
└── .env.example
```

## 3. 快速开始（本地开发）

### 3.1 前置要求

- Node.js >= 20
- pnpm >= 9（`npm i -g pnpm`）
- MongoDB 7（本地或 Docker）
- （可选）Redis 7 — 阶段三暂未实际使用，但 docker-compose 已就位

### 3.2 启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example apps/server/.env
# 编辑 apps/server/.env，至少确认 MONGODB_URI 和 CMDB_FIELD_ENC_KEY（64 位 hex）

# 3. 启动 MongoDB（两种方式任选）

# 方式 A：用 docker-compose
docker compose up -d mongo

# 方式 B：本地已装 MongoDB，直接用

# 4. 启动后端
pnpm dev:server
# → http://localhost:3030/api
# → Swagger: http://localhost:3030/docs

# 5. 启动前端
pnpm dev:web
# → http://localhost:5173
```

### 3.3 默认账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin` | admin |

> 启动时如检测不到 admin 用户会自动创建。生产环境请立即改密。

## 4. Docker 一键起

```bash
# 启动 mongo + redis + server + web
docker compose up -d --build

# 查看
docker compose ps
docker compose logs -f server
```

启动后访问 `http://localhost:8080`（web 端口在 compose 里映射）。

## 5. 常用命令

```bash
# 根目录
pnpm dev                 # 启动 server + web（并行）
pnpm dev:server          # 只启动后端
pnpm dev:web             # 只启动前端
pnpm build               # 全部构建
pnpm lint                # ESLint sweep
pnpm docker:up           # 启动 mongo + redis
pnpm docker:down         # 停掉
```

```bash
# apps/server
pnpm --filter @cmdb/server build       # nest build
pnpm --filter @cmdb/server test       # jest
pnpm --filter @cmdb/server start:prod # 跑编译产物

# apps/web
pnpm --filter @cmdb/web build
pnpm --filter @cmdb/web preview       # 预览生产构建
```

## 6. 业务模块

| # | 模块 | 关键能力 |
|---|---|---|
| 1 | 元模型 | 分类 / 模型分组 / 模型 / 字段分组 / 字段 CRUD，6 字段类型 |
| 2 | 资源仓库 | 每个模型对应 MongoDB `m_<uid>` 集合，动态 schema 工厂，CRUD + 批量删 + 全文索引 |
| 3 | 标签 | K-V 标签 + 跨模型资源绑定，AND 语义搜索 |
| 4 | 应用视图 | 业务 → 应用树，资源关联，environment 标签过滤 |
| 5 | 全局搜索 | MongoDB text 索引 + 跨集合 + 多关键字语法（与/或/排除） |
| 6 | 定时任务 | cron 调度 + 任务 CRUD + 执行日志 + 失败告警 + CloudProvider 抽象 |
| 7 | 鉴权 | JWT + 全局 Guard + admin/operator/viewer 三角色 |
| 8 | 审计 | 所有写操作自动记 audit_logs（含 username/ip/耗时） |
| 9 | 监控 | `/api/metrics` Prometheus 端点 + HTTP histogram + 业务计数器 |

## 7. 业务规则（来自 readme §7.2 删除约束）

| 操作 | 前置条件 |
|---|---|
| 删模型分组 | 分组下无模型 |
| 删模型 | 模型下无字段分组（实现层：内置 + 应用层强校验） |
| 删字段分组 | 分组下无字段 |
| 删字段 | 字段无数据 |
| 删标签值 | 标签值未绑定资源 |
| 删业务 | 业务下无应用 |

## 8. 添加新的云厂商同步适配器

1. 在 `apps/server/src/modules/sync/providers/` 新建文件，比如 `alicloud.ts`
2. `implements CloudProvider`，实现 `fetch(ctx)` 返回 `RemoteResource[]`
3. 在 `sync.module.ts` 的 `providers` 里注册，并在 `sync.service.ts` 的 `providers` Map 里 `set(name, instance)`
4. 创建一个新任务，`provider: 'alicloud'`，配 `region` + `resourceType` + `fieldMapping` 即可

## 9. Demo 录屏

```bash
# 需要先启动 server + web
node scripts/record-demo.cjs
# 产物：demo/cmdb-demo.webm
```

需要本地已装 Playwright Chromium（`pnpm exec playwright install chromium`）。

## 10. 排错

| 症状 | 排查 |
|---|---|
| `pnpm install` 报 `EPERM` | 不要用 corepack，直接 `npm i -g pnpm` |
| `Error: connect ECONNREFUSED ...:27017` | MongoDB 没起；或检查 `MONGODB_URI` |
| 401 | 缺 token / token 过期；前端会自动跳 `/login` |
| 字段 `Cpu` 和 `cpu` 同时存在 | 老版本 sync bug：现在只按 fieldMapping 写入，重跑一次 sync 即可 |
| 中文乱码 | 检查 PowerShell 是否用 UTF-8 发送（前端浏览器不会有问题） |
| Vite 报 `does not provide an export named` | `pnpm --filter @cmdb/shared build` 重构建 shared |

## 11. License

MIT
