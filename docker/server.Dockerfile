# Multi-stage build for NestJS server

# 1) 装依赖 + 构建 shared + server
FROM node:22-alpine AS builder
WORKDIR /app

# 启用 pnpm
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

# 先 copy 顶层 manifest（更好的缓存）
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY tsconfig.base.json* ./

RUN pnpm install --frozen-lockfile

# 源码
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# 构建 shared（prebuild 钩子会自动跑）
RUN pnpm --filter @cmdb/shared build
RUN pnpm --filter @cmdb/server build

# 2) 运行
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

# 只装 prod deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --prod

# 编译产物 + shared
COPY --from=builder /app/packages/shared/dist /app/packages/shared/dist
COPY --from=builder /app/apps/server/dist /app/apps/server/dist

WORKDIR /app/apps/server

EXPOSE 3030

# 启动（dist/main.js 是 nest build 出来的入口；配置已在 .env 注入或 env 直接传）
CMD ["node", "dist/main.js"]
