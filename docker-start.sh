#!/bin/bash

# CheapWindow - Docker 一键启动脚本
# 快速使用 Docker Compose 部署整个系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_step() { echo -e "${CYAN}▶${NC} $1"; }

echo ""
echo "========================================"
echo "  🐳 CheapWindow Docker 一键启动"
echo "========================================"
echo ""

# ==================== 步骤 1: 检查 Docker ====================
print_step "步骤 1/7: 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    echo ""
    echo "请先安装 Docker："
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | bash"
    echo "  或访问: https://docs.docker.com/get-docker/"
    exit 1
fi

DOCKER_VERSION=$(docker --version 2>&1)
print_success "Docker 已安装: $DOCKER_VERSION"

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose 未安装"
    echo ""
    echo "请先安装 Docker Compose："
    echo "  sudo apt install docker-compose-plugin"
    exit 1
fi

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    COMPOSE_VERSION=$(docker compose version --short 2>&1)
else
    COMPOSE_CMD="docker-compose"
    COMPOSE_VERSION=$(docker-compose --version 2>&1)
fi
print_success "Docker Compose 已安装: $COMPOSE_VERSION"
echo ""

# ==================== 步骤 2: 检查 Docker 权限 ====================
print_step "步骤 2/7: 检查 Docker 权限..."
if ! docker ps &> /dev/null; then
    print_warning "当前用户无权限运行 Docker"
    echo ""
    echo "请选择以下方案之一："
    echo "  1. 使用 sudo 运行此脚本: sudo ./docker-start.sh"
    echo "  2. 将当前用户添加到 docker 组:"
    echo "     sudo usermod -aG docker $USER"
    echo "     newgrp docker"
    exit 1
fi
print_success "Docker 权限检查通过"
echo ""

# ==================== 步骤 3: 创建环境配置 ====================
print_step "步骤 3/7: 配置环境变量..."
if [ ! -f ".env" ]; then
    print_info "创建 .env 配置文件..."
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
DB_HOST=mysql
DB_PORT=3306
DB_USER=cheapwindow
DB_PASSWORD=cheapwindow_pass_2024
DB_NAME=cheap_window
MYSQL_ROOT_PASSWORD=cheapwindow_root_pass_2024
PORT=3001
NODE_ENV=production
APP_PORT=3001
MYSQL_PORT=3306
EOF
    print_success "环境配置文件已创建: .env"
    print_warning "⚠️  生产环境请修改默认密码！"
else
    print_success "环境配置文件已存在"
fi
echo ""

# ==================== 步骤 4: 检查端口占用 ====================
print_step "步骤 4/7: 检查端口占用..."
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if sudo lsof -i :$port &> /dev/null; then
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1
        fi
    fi
    return 0
}

PORT_CONFLICT=0
if ! check_port 3001; then
    print_warning "端口 3001 已被占用"
    PORT_CONFLICT=1
fi

if ! check_port 3306; then
    print_warning "端口 3306 已被占用"
    PORT_CONFLICT=1
fi

if [ $PORT_CONFLICT -eq 1 ]; then
    echo ""
    read -p "是否继续？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "部署已取消"
        exit 1
    fi
else
    print_success "端口检查通过"
fi
echo ""

# ==================== 步骤 5: 停止旧容器 ====================
print_step "步骤 5/7: 清理旧容器..."
if $COMPOSE_CMD ps -q &> /dev/null; then
    print_info "停止正在运行的容器..."
    $COMPOSE_CMD down 2>/dev/null || true
    print_success "旧容器已停止"
else
    print_info "没有运行中的容器"
fi
echo ""

# ==================== 步骤 6: 构建并启动 ====================
print_step "步骤 6/7: 构建并启动服务..."
echo ""
print_info "正在构建 Docker 镜像（首次运行可能需要几分钟）..."
if $COMPOSE_CMD build --no-cache; then
    print_success "镜像构建完成"
else
    print_error "镜像构建失败"
    exit 1
fi

echo ""
print_info "正在启动服务容器..."
if $COMPOSE_CMD up -d; then
    print_success "服务已启动"
else
    print_error "服务启动失败"
    exit 1
fi
echo ""

# ==================== 步骤 7: 健康检查 ====================
print_step "步骤 7/7: 等待服务就绪..."
echo ""
print_info "等待数据库初始化（最多60秒）..."
for i in {1..60}; do
    if docker exec cheapwindow-mysql mysqladmin ping -h localhost -u root -pcheapwindow_root_pass_2024 &> /dev/null; then
        print_success "数据库已就绪"
        break
    fi
    echo -ne "\r  等待中... $i/60 秒"
    sleep 1
done
echo ""

print_info "等待应用服务就绪（最多60秒）..."
for i in {1..60}; do
    if curl -sf http://localhost:3001/api/health &> /dev/null; then
        print_success "应用服务已就绪"
        break
    fi
    echo -ne "\r  等待中... $i/60 秒"
    sleep 1
done
echo ""

# ==================== 完成提示 ====================
echo ""
echo "========================================"
echo -e "  ${GREEN}✅ Docker 部署完成！${NC}"
echo "========================================"
echo ""
echo "📊 服务状态:"
$COMPOSE_CMD ps
echo ""
echo "🌐 访问地址:"
echo "  本地访问: http://localhost:3001"
if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "获取失败")
    echo "  公网访问: http://$PUBLIC_IP:3001"
fi
echo ""
echo "📝 常用命令:"
echo "  查看日志:     $COMPOSE_CMD logs -f"
echo "  查看应用日志:  $COMPOSE_CMD logs -f app"
echo "  查看数据库日志: $COMPOSE_CMD logs -f mysql"
echo "  重启服务:     $COMPOSE_CMD restart"
echo "  停止服务:     $COMPOSE_CMD stop"
echo "  完全清理:     $COMPOSE_CMD down -v"
echo ""
echo "🔧 调试工具:"
echo "  进入应用容器: docker exec -it cheapwindow-app sh"
echo "  进入数据库:   docker exec -it cheapwindow-mysql mysql -uroot -p"
echo ""
print_warning "⚠️  记得修改 .env 中的默认密码！"
echo ""

