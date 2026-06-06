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
