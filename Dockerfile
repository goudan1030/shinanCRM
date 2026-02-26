FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装dependencies
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine 以了解为什么libc6-compat是需要的
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# 安装依赖
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 构建应用
RUN npm run build:prod

# 生产应用
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 设置适当的权限
RUN mkdir -p /app/.next/standalone /app/.next/static /app/public
RUN chown nextjs:nodejs /app/.next/standalone /app/.next/static /app/public

# 复制构建输出
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量和运行时配置
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 使用集群模式启动应用
CMD ["node", "server.js"] 