# CMDB 配置管理平台

## 项目概述

基于 Golang + Vue 3 + MongoDB 开发的配置管理平台 (CMDB)。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go + Gin 框架 + MongoDB |
| 前端 | Vue 3 + Ant Design Vue + Axios |
| 认证 | JWT + LDAP/AD |
| 数据库 | MongoDB |

## 项目结构

```
cmdb/
├── cmd/
│   └── server/
│       └── main.go           # 后端入口
├── config/
│   ├── config.go             # 配置加载
│   └── mongodb.go            # MongoDB 连接
├── database/
│   └── mongodb.go            # 数据库操作
├── internal/
│   ├── models/
│   │   └── models.go          # 数据模型
│   ├── middleware/
│   │   ├── auth.go           # JWT 认证
│   │   └── cors.go           # 跨域中间件
│   ├── routers/
│   │   └── router.go         # API 路由
│   └── services/
│       ├── ldap.go           # LDAP/AD 服务
│       ├── user.go           # 用户服务
│       ├── model.go          # 模型服务
│       └── resource.go       # 资源服务
├── config.yaml               # 配置文件
├── go.mod / go.sum           # Go 依赖
└── web/                      # Vue 前端
    ├── src/
    │   ├── api/              # API 调用
    │   ├── components/      # 通用组件
    │   ├── router/          # 路由配置
    │   ├── store/           # 状态管理
    │   ├── views/           # 页面组件
    │   └── main.js          # 前端入口
    └── package.json
```

## 开发规范

### Go 后端

#### 命名规范
- 文件名: 小写下划线 (user_service.go)
- 结构体: 大驼峰 (UserService)
- 变量/函数: 驼峰命名 (userName, GetUser)
- 常量: 全大写下划线 (MAX_CONNECTIONS)
- 缩写词全大写: URL, HTTP, API, ID, JSON

#### 代码组织
```
internal/
├── handlers/     # HTTP 处理层 (可选，从 routers 分离)
├── services/    # 业务逻辑层
├── repositories/# 数据访问层 (可选)
├── models/      # 数据模型
└── middleware/  # 中间件
```

#### 错误处理
- 必须使用 wrap 包装: `fmt.Errorf("%w", err)`
- 禁止使用 panic
- 错误统一返回格式: `{ code: 400, message: "错误信息" }`

#### API 响应格式
```go
c.JSON(200, gin.H{
    "code": 200,
    "data": data,
    "message": "success"
})
```

### Vue 前端

#### 目录结构
```
web/src/
├── api/         # API 接口定义
├── components/ # 通用组件
├── router/     # 路由配置
├── store/      # 状态管理 (Pinia/Vuex)
├── views/      # 页面组件
└── utils/     # 工具函数
```

#### Vue 3 规范
- 使用 `<script setup>` 或 `setup()` Composition API
- 组件命名: 大驼峰 (UserForm.vue) 或 kebab-case
- Props 必须定义类型
- 事件使用 emits 声明

#### API 调用规范
- 统一在 api/index.js 中定义
- 使用 axios，配置请求/响应拦截器
- Token 自动注入 Authorization header
- 401 自动跳转登录页

#### 列表规范
- 必须有 loading 状态
- 必须有分页
- 空数据显示空状态组件

#### 表单规范
- 必须有校验规则
- 提交前验证
- 错误提示使用 message.error

## 常用命令

### 后端
```bash
# 运行
go run cmd/server/main.go

# 编译
go build -o cmdb.exe ./cmd/server

# 测试
go test -v ./...

# 依赖
go mod tidy
```

### 前端
```bash
# 安装依赖
cd web && npm install

# 开发运行
cd web && npm run serve

# 生产构建
cd web && npm run build
```

## API 接口规范

### 路径规范
- 前缀: /api/v1
- 资源: 复数形式 (/users, /models, /resources)
- 嵌套: /resources/:id/relations
- 查询: ?page=1&pageSize=10

### 响应格式
```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```

### 错误码
| 码 | 说明 |
|----|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

### 分页响应
```json
{
  "code": 200,
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

## 配置文件 (config.yaml)

```yaml
server:
  host: 0.0.0.0
  port: 8080

mongodb:
  host: localhost
  port: 27017
  database: cmdb

ldap:
  enabled: false
  host: ""
  port: 389
  base_dn: ""
  ad:
    enabled: false
    domain: ""
```

## 测试账号

- 用户名: admin
- 密码: admin123

**首次启动需手动在 MongoDB 创建 admin 用户**（router 未实现 CreateDefaultAdmin）：

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

## 测试

### 后端

| 类型 | 命令 | 说明 |
|------|------|------|
| 单元测试 | `go test ./...` | 15 测试，无外部依赖 |
| 集成测试 | `go test -tags=integration ./...` | 4 测试，需 MongoDB；不可达时自动 skip |

测试文件位置：
- `internal/middleware/{auth,cors}_test.go` — JWT + CORS
- `internal/routers/helpers_test.go` — 加密/校验/参数解析
- `internal/services/integration_test.go` — 业务层（ModelService 自动建分组/字段、Tag 双向绑定等）

### 前端

| 命令 | 说明 |
|------|------|
| `cd web && npm test` | 跑 31 个 Vitest 测试 |
| `cd web && npm run test:watch` | watch 模式 |
| `cd web && npm run build` | 生产构建 |

测试文件位置（`web/src/**/__tests__/*.spec.js`）：
- `api/__tests__/interceptors.spec.js` — token 注入、401 跳转
- `store/__tests__/store.spec.js` — Vuex mutations + actions
- `router/__tests__/guard.spec.js` — 鉴权守卫
- `views/__tests__/Search.spec.js` — 搜索 + 跳转（review 修复）
- `views/__tests__/Tag.spec.js` — loadTagKeys 字段映射（review 修复）
- `views/__tests__/Resource.spec.js` — mount 稳定性 + 路由 query 消费

### E2E CRUD（HTTP API 全页面）

`C:\Users\kim\AppData\Local\Temp\cmdb_e2e_test.sh` — 覆盖 8 个页面、86 个 API 用例。前置：MongoDB + 后端 + 前端 全部运行；脚本会先清库再跑。

```bash
bash /c/Users/kim/AppData/Local/Temp/cmdb_e2e_test.sh
```

## 已知 Bug 修复记录（2026-06）

### code-review + simplify 阶段（review 报告）

| 文件 | 严重度 | 修复 |
|------|--------|------|
| `internal/services/model.go` | CRITICAL | 删除非法 `func errors.New(...)` 语法 + 补 errors import |
| `internal/services/user.go` | HIGH | `mongo.FindOptions` → `options.FindOptions` + 修 int64 转换 |
| `internal/services/resource.go` | HIGH | 修 `models` 变量遮蔽包名 + 补 errors import |
| `internal/middleware/cors.go` | MEDIUM | 移除硬设的 Content-Type 头（污染 204 预检与非 JSON 端点） |
| `internal/routers/router.go` globalSearch | HIGH | `regexp.QuoteMeta` 转义 + keyword 长度上限 64 字节（防 ReDoS） |
| `internal/routers/router.go` batchDeleteResources | MEDIUM | 收集 invalid_ids + 全非法时返回 400 |
| `web/src/views/Tag.vue` | CRITICAL | `tagKeyColumns` dataIndex 改 `tag_name`/`tag_identify` |
| `web/src/views/Resource.vue` | CRITICAL | onMounted 读 `route.query` 自动打开 Search.vue 跳来的详情 |

### 集成测试驱动发现

| 文件 | 症状 | 修复 |
|------|------|------|
| `internal/services/resource.go` BindResource | `$addToSet` 在 null 字段崩溃 | pipeline + `$ifNull` 原子处理 + 双向同步 resources.tags |
| `internal/routers/router.go` bindAppResource | `$addToSet` 在 null 字段崩溃 | 同上 pipeline 模式 |
| `internal/routers/router.go` unbindAppResource | `$pull` 在 null 字段崩溃 | 加 `$type:array` 过滤 |

### 用户反馈修复

| 文件 | 症状 | 修复 |
|------|------|------|
| `web/vue.config.js` | 直接访问 /resource 等深层路径 404 | 加 `historyApiFallback: true` |
| `web/src/views/Resource.vue` | mount 时抛 "Cannot read properties of undefined (reading 'query')" | `useRoute()` 必须在 setup 顶层同步调用，不能在 onMounted 中 |

## Skill 使用

### 指定后端开发
```
@agent 使用 go-backend skill 开发用户管理功能
```

### 指定前端开发
```
@agent 使用 react-frontend skill 开发用户管理页面
```

### 指定数据库操作
```
@agent 使用 mongodb skill 添加用户表的索引
```

### 完整开发流程
```
@agent 使用 go-backend + react-frontend skill 添加资源标签功能
```
