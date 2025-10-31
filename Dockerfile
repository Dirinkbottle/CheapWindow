# 多人励志弹窗系统 - Docker 镜像
# 多阶段构建优化镜像大小

# ==================== 阶段 1: 前端构建 ====================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# 复制前端 package 文件
COPY client/package*.json ./

# 安装依赖
RUN npm ci --legacy-peer-deps

# 复制前端源码
COPY client/ ./

# 构建前端
RUN npm run build

# ==================== 阶段 2: 后端依赖安装 ====================
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# 复制后端 package 文件
COPY server/package*.json ./

# 只安装生产依赖
RUN npm ci --production --legacy-peer-deps

# ==================== 阶段 3: 最终运行镜像 ====================
FROM node:18-alpine

# 安装必要的系统工具
RUN apk add --no-cache \
    curl \
    bash \
    tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 创建应用目录
WORKDIR /app

# 复制后端依赖
COPY --from=backend-builder /app/server/node_modules ./node_modules

# 复制后端源码
COPY server/package*.json ./
COPY server/src ./src
COPY server/ecosystem.config.cjs ./
COPY server/init.sql ./

# 复制前端构建产物到 public 目录
COPY --from=frontend-builder /app/client/dist ./public

# 创建日志目录
RUN mkdir -p /app/logs

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["node", "src/index.js"]

