#!/bin/bash

# CheapWindow - 统一启动入口脚本
# 支持多种启动方式：Docker、PM2、调试模式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 打印函数
print_header() {
    echo ""
    echo "========================================"
    echo -e "  ${CYAN}$1${NC}"
    echo "========================================"
    echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

print_header "🚀 CheapWindow 启动向导"

# 检测已安装的工具
DOCKER_INSTALLED=false
DOCKER_COMPOSE_INSTALLED=false
NODE_INSTALLED=false
MYSQL_INSTALLED=false
PM2_INSTALLED=false

echo "正在检测系统环境..."
echo ""

if command -v docker &> /dev/null; then
    DOCKER_INSTALLED=true
    print_success "Docker 已安装 ($(docker --version | cut -d' ' -f3 | cut -d',' -f1))"
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    DOCKER_COMPOSE_INSTALLED=true
    print_success "Docker Compose 已安装"
fi

if command -v node &> /dev/null; then
    NODE_INSTALLED=true
    print_success "Node.js 已安装 ($(node -v))"
fi

if command -v mysql &> /dev/null; then
    MYSQL_INSTALLED=true
    print_success "MySQL 已安装"
fi

if command -v pm2 &> /dev/null; then
    PM2_INSTALLED=true
    print_success "PM2 已安装 (v$(pm2 -v))"
fi

echo ""

# 如果没有任何工具，提示安装
if [ "$DOCKER_INSTALLED" = false ] && [ "$NODE_INSTALLED" = false ]; then
    print_error "未检测到 Docker 或 Node.js 环境"
    echo ""
    echo "请先安装以下工具之一："
    echo ""
    echo "选项 1: Docker (推荐新手)"
    echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | bash"
    echo "  或访问: https://docs.docker.com/get-docker/"
    echo ""
    echo "选项 2: Node.js + MySQL (传统方式)"
    echo "  Node.js: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  MySQL: sudo apt install mysql-server"
    echo ""
    exit 1
fi

# 显示启动选项
print_header "📋 请选择启动方式"

OPTION_NUMBER=1
declare -A OPTIONS

if [ "$DOCKER_INSTALLED" = true ] && [ "$DOCKER_COMPOSE_INSTALLED" = true ]; then
    echo -e "${GREEN}[$OPTION_NUMBER]${NC} 🐳 Docker 方式启动 ${CYAN}(推荐)${NC}"
    echo "     • 无需配置环境，一键启动"
    echo "     • 包含 MySQL 数据库"
    echo "     • 易于管理和清理"
    echo ""
    OPTIONS[$OPTION_NUMBER]="docker"
    ((OPTION_NUMBER++))
fi

if [ "$NODE_INSTALLED" = true ] && [ "$MYSQL_INSTALLED" = true ]; then
    echo -e "${GREEN}[$OPTION_NUMBER]${NC} 📦 PM2 传统方式启动"
    echo "     • 使用本地 Node.js 和 MySQL"
    echo "     • 性能更好"
    echo "     • 需要手动配置环境"
    echo ""
    OPTIONS[$OPTION_NUMBER]="pm2"
    ((OPTION_NUMBER++))
fi

if [ "$NODE_INSTALLED" = true ] && [ -d "webgl-demo" ]; then
    echo -e "${GREEN}[$OPTION_NUMBER]${NC} 🎨 仅启动 WebGL 演示服务"
    echo "     • 在端口 3002 上启动演示"
    echo "     • 需要主服务和数据库已运行"
    echo "     • 用于参数调试和测试"
    echo ""
    OPTIONS[$OPTION_NUMBER]="webgl-demo"
    ((OPTION_NUMBER++))
fi

echo -e "${GREEN}[$OPTION_NUMBER]${NC} 🔍 仅运行系统诊断"
echo "     • 检查系统状态"
echo "     • 不启动服务"
echo ""
OPTIONS[$OPTION_NUMBER]="debug"
((OPTION_NUMBER++))

echo -e "${GREEN}[0]${NC} ❌ 退出"
echo ""

# 读取用户选择
while true; do
    read -p "请选择 [0-$((OPTION_NUMBER-1))]: " choice
    
    if [ "$choice" = "0" ]; then
        echo ""
        print_info "已退出"
        exit 0
    fi
    
    if [ -n "${OPTIONS[$choice]}" ]; then
        SELECTED_METHOD="${OPTIONS[$choice]}"
        break
    else
        print_error "无效选择，请重新输入"
    fi
done

echo ""

# 执行选择的启动方式
case "$SELECTED_METHOD" in
    docker)
        print_header "🐳 启动 Docker 方式"
        if [ -f "./docker-start.sh" ]; then
            chmod +x ./docker-start.sh
            ./docker-start.sh
        else
            print_error "docker-start.sh 脚本不存在"
            exit 1
        fi
        ;;
        
    pm2)
        print_header "📦 启动 PM2 方式"
        if [ -f "./deploy.sh" ]; then
            chmod +x ./deploy.sh
            ./deploy.sh
        else
            print_error "deploy.sh 脚本不存在"
            exit 1
        fi
        ;;
        
    webgl-demo)
        print_header "🎨 启动 WebGL 演示服务"
        if [ ! -d "webgl-demo" ]; then
            print_error "webgl-demo 目录不存在"
            exit 1
        fi
        
        # 检查主服务是否运行
        if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/health" | grep -q "200"; then
            print_warning "主服务 (端口 3001) 未运行"
            echo ""
            read -p "是否启动主服务？(y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_info "正在启动主服务..."
                ./deploy.sh
            else
                print_error "WebGL 演示需要主服务运行才能连接数据库"
                exit 1
            fi
        fi
        
        cd webgl-demo
        
        # 安装依赖
        if [ ! -d "node_modules" ]; then
            print_info "安装依赖..."
            npm install
        fi
        
        # 检查是否已经在运行
        if pm2 list | grep -q "webgl-demo"; then
            print_info "WebGL 演示服务已在运行，重启中..."
            pm2 restart webgl-demo
        else
            print_info "启动 WebGL 演示服务..."
            pm2 start server.js --name webgl-demo
        fi
        
        cd ..
        
        # 等待服务启动
        sleep 2
        
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002/api/health" | grep -q "200"; then
            print_success "WebGL 演示服务已启动"
            echo ""
            echo "访问地址: http://localhost:3002"
            echo "查看日志: pm2 logs webgl-demo"
            echo "停止服务: pm2 stop webgl-demo"
        else
            print_warning "服务可能尚未完全启动，请稍后访问"
        fi
        ;;
        
    debug)
        print_header "🔍 运行系统诊断"
        if [ -f "./debug_check.sh" ]; then
            chmod +x ./debug_check.sh
            ./debug_check.sh
        else
            print_error "debug_check.sh 脚本不存在"
            exit 1
        fi
        ;;
        
    *)
        print_error "未知的启动方式"
        exit 1
        ;;
esac

echo ""
print_success "操作完成"
echo ""

