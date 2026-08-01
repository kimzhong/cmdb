# Multi-stage build for React web

FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/web/ apps/web/

# Vite 通过相对路径连后端；容器内用 3000
ENV VITE_API_BASE_URL=/api
RUN pnpm --filter @cmdb/shared build
RUN pnpm --filter @cmdb/web build

# 运行
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# 反代：/api → backend:3030/api
COPY docker/web.nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
