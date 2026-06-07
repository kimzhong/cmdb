# CMDB 配置管理平台

基于 **Go + Gin + MongoDB + Vue 3 + Ant Design Vue** 的轻量级配置管理（IT 资产）平台，参考「二丫讲梵 CMDB 平台建设指南」实现。
覆盖模型管理、资源仓库、关系建模、标签管理、全局搜索、应用视图、定时任务七大核心模块。

![Dashboard](docs/screenshots/02-dashboard.png)

---

## 📑 目录

- [功能一览](#-功能一览)
- [技术栈](#-技术栈)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [功能模块详解](#-功能模块详解)
  - [1. 登录](#1-登录)
  - [2. Dashboard](#2-dashboard)
  - [3. 模型管理](#3-模型管理)
  - [4. 资源仓库](#4-资源仓库)
  - [5. 标签管理](#5-标签管理)
  - [6. 全局搜索](#6-全局搜索)
  - [7. 应用视图](#7-应用视图)
  - [8. 定时任务](#8-定时任务)
- [API 接口概览](#-api-接口概览)
- [测试覆盖](#-测试覆盖)
- [已修复的关键问题](#-已修复的关键问题)
- [开发规范](#-开发规范)
- [许可证](#-许可证)

---

## 🚀 功能一览

| 模块 | 关键能力 | 状态 |
|------|----------|------|
| 模型管理 | 4 大分类（资产/应用/组织/其他） · 模型分组 · 6 种字段类型（string/number/date/select/password/relation） · 字段分组 · 关系定义（belong/connect） | ✅ 完成 |
| 资源仓库 | CRUD · 批量删除 · 关系管理（从属/连接） · 资源标签绑定 · 模型树导航 | ✅ 完成 |
| 标签管理 | 标签键 + 标签值 + 资源绑定 · 按标签过滤资源 · 环境标签（test/pre/prod） | ✅ 完成 |
| 全局搜索 | MongoDB 跨集合模糊搜索 · 跳转到资源详情 | ✅ 完成 |
| 应用视图 | 业务树 + 应用 + 资源关联 · 应用状态生命周期 | ✅ 完成 |
| 定时任务 | 阿里云/腾讯云/华为云/AWS 同步任务 · 全量/增量 · Cron · 手动执行 | ✅ 完成 |
| LDAP/AD | 本地 + LDAP 混合登录 | ⚠️ 基础集成（待真实环境测试） |
| 定时任务实际同步逻辑 | — | ❌ TODO（仅更新时间戳） |

---

## 🛠 技术栈

### 后端
| 组件 | 版本 | 用途 |
|------|------|------|
| Go | 1.21+ | 主语言 |
| Gin | 1.9.1 | HTTP 框架 |
| MongoDB Driver | 1.13.1 | 数据访问 |
| JWT | v5 | 无状态认证 |
| go-ldap | v3.4.6 | LDAP/AD 集成 |
| Viper | 1.18.2 | 配置加载 |
| bcrypt | golang.org/x/crypto | 密码哈希 |

### 前端
| 组件 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4 | 渐进式框架（Composition API） |
| Ant Design Vue | 4.1 | UI 组件库 |
| Vue Router | 4.3 | SPA 路由 |
| Vuex | 4.1 | 状态管理 |
| Axios | 1.6 | HTTP 客户端 |
| Vite / vue-cli | 5.0 | 构建工具 |

### 数据库
- **MongoDB 8.x** — 主存储（动态 BSON 字段天然契合模型的动态字段需求）

### 测试
- **Vitest** + **happy-dom** + **@vue/test-utils** + **axios-mock-adapter** — 前端
- **Go testing** — 后端
- **playwright-core** + 系统 Chrome — 真实浏览器 E2E
- **curl + Python** — HTTP API E2E

---

## 📁 项目结构

```
cmdb/
├── cmd/
│   └── server/
│       └── main.go                # 后端入口（加载配置 → 连 MongoDB → 注册路由 → 启动 Gin）
├── config/
│   ├── config.go                 # 配置结构 + Viper 加载
│   └── mongodb.go                # （历史文件，已被 database/ 替代）
├── database/
│   └── mongodb.go                # MongoDB 连接管理（InitMongoDB / GetCollection / Close）
├── internal/
│   ├── models/
│   │   └── models.go              # 11 个数据模型（User, ModelGroup, Model, FieldGroup,
│   │                              #   Field, Relation, Resource, TagKey, TagValue,
│   │                              #   SyncTask, Application, Business）
│   ├── middleware/
│   │   ├── auth.go                # JWT 生成/解析/AuthMiddleware/AdminMiddleware
│   │   └── cors.go                # CORS 跨域
│   ├── routers/
│   │   ├── router.go              # 所有 HTTP handler（~2500 行）
│   │   └── helpers_test.go        # 纯函数测试
│   ├── services/                  # 业务逻辑层（与 router 解耦的完整实现）
│   │   ├── ldap.go                # LdapService（真实 LDAP/AD 客户端）
│   │   ├── user.go                # UserService（CRUD + bcrypt）
│   │   ├── model.go               # 模型/分组/字段分组/字段服务
│   │   └── resource.go            # 资源/标签/关系服务
├── config.yaml                   # 运行时配置
├── go.mod / go.sum                # Go 依赖
├── docs/
│   ├── 设计文档.md
│   ├── 使用手册.md
│   └── screenshots/               # 功能截图
├── tests/                         # E2E 测试
│   ├── README.md
│   ├── e2e_api.sh                 # 86 个 API 用例
│   └── e2e_frontend.js            # 26 个真实浏览器用例
├── web/                           # Vue 3 前端
│   ├── src/
│   │   ├── api/index.js           # Axios 封装 + 拦截器
│   │   ├── router/index.js        # 路由 + 鉴权守卫
│   │   ├── store/index.js         # Vuex
│   │   └── views/                 # 8 个页面
│   ├── public/index.html
│   ├── package.json
│   └── vue.config.js              # 代理 + SPA fallback
├── CLAUDE.md                      # AI 协作规范
├── start.bat / stop.bat           # Windows 启动/停止脚本
└── requirement.md                 # 原始需求文档
```

---

## 🏃 快速开始

### 前置条件
- Go 1.21+
- Node.js 18+
- MongoDB 4.4+（本地或远程）
- （可选）Chrome 浏览器 — 仅前端 E2E 需要

### 1. 克隆与配置
```bash
git clone <repo>
cd cmdb
# 编辑 config.yaml 确认 MongoDB 地址
```

### 2. 启动 MongoDB
```bash
# 选项 A：系统服务（推荐）
net start MongoDB   # Windows

# 选项 B：直接启动（用户本地环境）
"C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe" \
  --dbpath C:/tmp/mongodb/data \
  --logpath C:/tmp/mongodb/log/mongod.log \
  --port 27017 --bind_ip 127.0.0.1
```

### 3. 创建初始 admin 账号
```bash
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

### 4. 启动后端
```bash
go run cmd/server/main.go
# 或编译后运行
go build -o cmdb.exe ./cmd/server && ./cmdb.exe
# 后端运行在 http://localhost:8081
```

### 5. 启动前端
```bash
cd web
npm install
npm run serve
# 前端运行在 http://localhost:3000
```

### 6. 一键启动（Windows）
```bash
# 双击 start.bat
# 或在 bash 中：
cmd //c start.bat
```

打开 http://localhost:3000，用 `admin / admin123` 登录。

---

## 📖 功能模块详解

### 1. 登录

> JWT 无状态认证，bcrypt 密码哈希，24h token 有效期。

| 登录页 | 填表 + 提交 |
|--------|-------------|
| ![登录页](docs/screenshots/01-login.png) | ![登录填写](docs/screenshots/01-login-filled.png) |

**接口**：`POST /api/v1/login` · `POST /api/v1/ldap/login` · `POST /api/v1/users/register`

---

### 2. Dashboard

> 登录后首屏，展示模型/资源/标签/用户四项统计，提供 4 个常用入口。

![Dashboard](docs/screenshots/02-dashboard.png)

**接口**：`GET /api/v1/stats`

---

### 3. 模型管理

> 4 大分类（资产/应用/组织/其他）下创建模型分组、模型、字段分组、字段、关系定义。
> **创建模型时自动建立"基本属性"与"关系属性"两个字段分组，以及"唯一标识"与"名称"两个内置字段。**

| 列表 | 创建分组 | 选中分组 | 创建模型 |
|------|---------|---------|---------|
| ![Model 列表](docs/screenshots/03-model-list.png) | ![创建分组](docs/screenshots/03-model-create-group.png) | ![选中分组](docs/screenshots/03-model-group-selected.png) | ![创建模型](docs/screenshots/03-model-create.png) |

**字段类型**（6 种）：`string` / `number` / `date` / `select` / `password`（DES 加密）/ `relation`
**关系类型**（2 种）：`belong`（一对一从属） / `connect`（多对多连接）

**接口**：`/api/v1/model-groups` · `/api/v1/models` · `/api/v1/field-groups` · `/api/v1/fields` · `/api/v1/relations`

---

### 4. 资源仓库

> 左侧模型树 → 右侧资源列表。模型选定后，资源表单按模型动态字段渲染。
> 关系管理（从属/连接）支持双向查询，标签可绑定到资源。

| 资源列表 | 选中模型 |
|---------|---------|
| ![资源列表](docs/screenshots/04-resource-list.png) | ![选中模型](docs/screenshots/04-resource-selected.png) |

**接口**：`/api/v1/resources` · `/api/v1/resources/:id/relations` · `/api/v1/resources/:id/tags` · `/api/v1/resources/batch-delete`

---

### 5. 标签管理

> 标签键（TagKey） + 标签值（TagValue） + 资源绑定。
> 资源 → 标签值 是多对多，绑定时双向同步（`tag_values.resources` 与 `resources.tags` 互写）。
> 修复后列 dataIndex 与字段名一致，表格列正常渲染。

| 标签键列表 | 修复后表格列 | 创建键 | 抽屉管理值 | 创建值 |
|----------|------------|-------|----------|-------|
| ![Tag 列表](docs/screenshots/05-tag-list.png) | ![Tag 表格列](docs/screenshots/05-tag-table-fixed.png) | ![创建键](docs/screenshots/05-tag-create-key.png) | ![管理值](docs/screenshots/05-tag-manage-values.png) | ![创建值](docs/screenshots/05-tag-create-value.png) |

**接口**：`/api/v1/tags` · `/api/v1/tags/:id/values` · `/api/v1/tags/values/:id/bind` · `/api/v1/tags/search`

---

### 6. 全局搜索

> 单输入框跨所有资源表模糊搜索，跳转到资源详情。

![全局搜索](docs/screenshots/06-search.png)

**接口**：`GET /api/v1/search?keyword=xxx`

**安全防御**：
- keyword 长度上限 64 字节（防 ReDoS）
- 用 `regexp.QuoteMeta` 转义正则元字符

---

### 7. 应用视图

> 业务树 → 应用 → 关联资源。应用状态：`planning` → `developing` → `testing` → `running` → `stopped`。

| 应用列表 | 创建业务 | 创建应用 |
|---------|---------|---------|
| ![应用列表](docs/screenshots/07-app-list.png) | ![创建业务](docs/screenshots/07-app-create-biz.png) | ![创建应用](docs/screenshots/07-app-create-app.png) |

**接口**：`/api/v1/businesses` · `/api/v1/apps` · `/api/v1/apps/:id/resources`

---

### 8. 定时任务

> 同步任务管理，支持阿里云/腾讯云/华为云/AWS 4 种云类型，全量/增量两种同步模式，Cron 表达式调度，手动触发。

| 任务列表 | 创建任务 |
|---------|---------|
| ![任务列表](docs/screenshots/08-task-list.png) | ![创建任务](docs/screenshots/08-task-create.png) |

**接口**：`/api/v1/tasks` · `/api/v1/tasks/:id/run`

**已知局限**：`runTask` handler 仅更新 `last_run_at` 时间戳，**实际云资源拉取逻辑待实现**（标记 TODO）。

---

## 📡 API 接口概览

完整 API 列表见 [`docs/设计文档.md`](docs/设计文档.md)。共 **70+** 个端点，按 `/api/v1/<resource>` 风格组织。

| 资源 | 端点数 | 鉴权 |
|------|-------|------|
| 用户/认证 | 5 | 部分公开 |
| 模型管理 | 22 | 需 JWT |
| 资源仓库 | 12 | 需 JWT |
| 标签管理 | 10 | 需 JWT |
| 全局搜索 | 1 | 需 JWT |
| 业务/应用 | 10 | 需 JWT |
| 定时任务 | 7 | 需 JWT |
| 统计 | 1 | 需 JWT |

### 响应格式
```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```

### 错误码
| 码 | 含义 |
|----|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 鉴权流程
1. `POST /api/v1/login` → 拿到 JWT
2. 后续请求带 `Authorization: Bearer <token>` 头
3. Token 24 小时有效

---

## ✅ 测试覆盖

完整测试金字塔（**162 用例**）：

| 层级 | 文件 | 用例 | 状态 |
|------|------|------|------|
| 后端单元 | `internal/middleware/*_test.go` | 10 | ✅ |
| 后端单元 | `internal/routers/helpers_test.go` | 6 | ✅ |
| 后端集成 | `internal/services/integration_test.go`（build tag） | 4 | ✅ |
| 前端单元 | `web/src/**/__tests__/*.spec.js` | 31 | ✅ |
| **E2E API** | [`tests/e2e_api.sh`](tests/e2e_api.sh) | **86** | ✅ |
| **E2E 浏览器** | [`tests/e2e_frontend.js`](tests/e2e_frontend.js) | **26** | ✅ |

### 运行测试
```bash
# 后端
go test ./...                                  # 单元
go test -tags=integration ./...                 # 集成（需 MongoDB）

# 前端
cd web && npm test

# 端到端
bash tests/e2e_api.sh                          # 86 用例
node tests/e2e_frontend.js                     # 26 用例
```

详见 [`tests/README.md`](tests/README.md)。

---

## 🐛 已修复的关键问题

> 2026-06 代码 review + 集成测试驱动专项

### review 阶段（10 条 finding）

| 严重度 | 文件 | 问题 | 修复 |
|--------|------|------|------|
| CRITICAL | `internal/services/model.go` | 死代码含 `func errors.New(...)` 非法 Go 语法 | 删除 + 补 `errors` import |
| CRITICAL | `web/src/views/Tag.vue` | `tagKeyColumns` dataIndex 与 loadTagKeys 映射字段不一致 | 改 `dataIndex: 'tag_name'` / `'tag_identify'` |
| CRITICAL | `web/src/views/Resource.vue` | `Search.vue` 跳 query 不被消费 | onMounted 读 query 自动打开详情 |
| HIGH | `internal/routers/router.go` | `globalSearch` 未 `QuoteMeta` 转义 → ReDoS | `regexp.QuoteMeta` + 64 字节限长 |
| HIGH | `internal/middleware/cors.go` | 硬设 `Content-Type` 污染所有响应 | 移除该行 |
| HIGH | `internal/routers/router.go` | `batchDeleteResources` 无 ownership 检查 + 静默吞非法 ID | 收集 `invalid_ids` + 全非法返回 400 |
| MEDIUM | `internal/routers/router.go` | `globalSearch` fallback 用 `fmt.Sprintf` + 100 条截断 | — |
| LOW | `internal/routers/router.go` | `createTagValue` 时间戳补丁应通用化 | — |

### 集成测试驱动（3 个真实业务 bug）

| 文件 | 症状 | 修复 |
|------|------|------|
| `internal/services/resource.go` BindResource | `$addToSet` 在 null 字段崩溃 | pipeline + `$ifNull` 原子处理 + 双向同步 |
| `internal/routers/router.go` bindAppResource | `$addToSet` 在 null 字段崩溃 | 同上 |
| `internal/routers/router.go` unbindAppResource | `$pull` 在 null 字段崩溃 | 加 `$type:array` 过滤 |

### 用户反馈修复

| 反馈 | 修复 |
|------|------|
| 直接访问 `/resource` 404 | `vue.config.js` 加 `historyApiFallback: true` |
| `/resource` 页面 mount 报 TypeError | `useRoute()` 必须在 setup 顶层调用，不能在 `onMounted` 中 |
| 字段命名不一致（`last_run_at` vs `lastRunAt`） | —（文档已说明） |

### 死代码清理

`config/mongodb.go` 与 `database/mongodb.go` 重复，已删除前者。

---

## 📐 开发规范

详见 [`CLAUDE.md`](CLAUDE.md)。要点：

### Go 后端命名
- 文件：小写下划线（`user_service.go`）
- 结构体：大驼峰（`UserService`）
- 函数/变量：驼峰（`userName`, `GetUser`）
- 常量：全大写下划线（`MAX_CONNECTIONS`）

### 错误处理
```go
// 必须 wrap
return fmt.Errorf("operation failed: %w", err)

// 禁止 panic
// 统一响应：{ code: 400, message: "错误信息" }
```

### 前端组件
- 使用 `<script setup>` 或 setup() Composition API
- Props 必须定义类型
- 事件用 emits 声明
- API 统一在 `api/index.js`，401 自动跳登录

### API 响应
```json
{ "code": 200, "data": {}, "message": "success" }
```

---

## 🤝 贡献

1. Fork 仓库
2. 创建特性分支：`git checkout -b feat/xxx`
3. 提交改动：`git commit -m "feat: xxx"`
4. 推送分支：`git push origin feat/xxx`
5. 发起 Pull Request

### 提交前必跑
```bash
# 后端
go vet ./... && go test ./...
# 前端
cd web && npm test
# 端到端
bash tests/e2e_api.sh
node tests/e2e_frontend.js
```

---

## 📚 相关文档

- [`requirement.md`](requirement.md) — 原始需求规格
- [`docs/设计文档.md`](docs/设计文档.md) — 数据模型 + API 设计
- [`docs/使用手册.md`](docs/使用手册.md) — 用户操作指南
- [`tests/README.md`](tests/README.md) — 测试说明
- [`CLAUDE.md`](CLAUDE.md) — AI 协作规范

---

## 📄 许可证

本项目仅供学习与内部使用。

---

## 🙏 致谢

- 架构设计参考：[二丫讲梵 - CMDB 平台建设指南](https://wiki.eryajf.net/pages/4bcf72/)
- UI 框架：[Ant Design Vue](https://antdv.com/)
- 数据库：[MongoDB](https://www.mongodb.com/)

---

> 最近更新：2026-06 · 配套 test/ 目录含 162 个测试用例 · 文档版本 1.0
