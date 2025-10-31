#!/bin/bash

# CheapWindow 多人励志弹窗系统 - 增强版部署脚本
# 支持详细的系统检查、环境验证和自动修复建议
# 适用于 Ubuntu/Debian 系统

set -e  # 遇到错误立即退出

# ==================== 全局变量 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"
MODE="prod"  # prod/dev
SILENT=false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 统计计数器
CHECK_PASS=0
CHECK_FAIL=0
CHECK_WARN=0

# ==================== 日志函数 ====================
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo "========================================" | tee -a "$LOG_FILE"
    echo -e "  ${CYAN}$1${NC}" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
    ((CHECK_PASS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
    ((CHECK_FAIL++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
    ((CHECK_WARN++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1" | tee -a "$LOG_FILE"
}

# ==================== 参数解析 ====================
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --prod)
            MODE="prod"
            shift
            ;;
        --silent)
            SILENT=true
            shift
            ;;
        --help)
            echo "使用方法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --dev        开发模式部署"
            echo "  --prod       生产模式部署（默认）"
            echo "  --silent     静默模式（跳过确认）"
            echo "  --help       显示帮助"
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            echo "使用 --help 查看帮助"
            exit 1
            ;;
    esac
done

# ==================== 开始部署 ====================
print_header "🚀 CheapWindow 增强版部署脚本 v2.0"

log "部署模式: $MODE"
log "日志文件: $LOG_FILE"
log "部署阶段: 10 个阶段"
echo ""

# ==================== 预检查阶段 ====================
print_header "📋 阶段 1: 系统环境预检查"

# 检查 1: 操作系统
print_step "检查操作系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "操作系统: $PRETTY_NAME"
    log "OS: $ID $VERSION_ID ($VERSION_CODENAME)"
else
    print_warning "无法检测操作系统版本"
fi

# 检查 2: 系统架构
print_step "检查系统架构..."
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "aarch64" ]; then
    print_success "系统架构: $ARCH"
else
    print_warning "不常见的系统架构: $ARCH"
fi

# 检查 3: CPU 信息
print_step "检查 CPU..."
if command -v lscpu &> /dev/null; then
    CPU_CORES=$(lscpu | grep "^CPU(s):" | awk '{print $2}')
    CPU_MODEL=$(lscpu | grep "Model name:" | cut -d':' -f2 | xargs)
    print_success "CPU: $CPU_CORES 核心 ($CPU_MODEL)"
else
    CPU_CORES=$(nproc 2>/dev/null || echo "未知")
    print_success "CPU 核心数: $CPU_CORES"
fi

# 检查 4: 内存
print_step "检查内存..."
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
    AVAIL_MEM=$(free -h | awk '/^Mem:/ {print $7}')
    MEM_PERCENT=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    if [ "$MEM_PERCENT" -lt 80 ]; then
        print_success "内存: $TOTAL_MEM 总计, $AVAIL_MEM 可用 (使用率: ${MEM_PERCENT}%)"
    else
        print_warning "内存使用率较高: ${MEM_PERCENT}%"
    fi
fi

# 检查 5: 磁盘空间
print_step "检查磁盘空间..."
DISK_AVAIL=$(df -h . | awk 'NR==2 {print $4}')
DISK_PERCENT=$(df . | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$DISK_PERCENT" -lt 80 ]; then
    print_success "磁盘空间: $DISK_AVAIL 可用 (使用率: ${DISK_PERCENT}%)"
else
    print_warning "磁盘空间不足，使用率: ${DISK_PERCENT}%"
fi

# 检查 6: 系统负载
print_step "检查系统负载..."
if command -v uptime &> /dev/null; then
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | xargs)
    print_success "系统负载: $LOAD_AVG"
fi

echo ""

# ==================== 依赖检查阶段 ====================
print_header "🔧 阶段 2: 依赖环境检查"

# 检查 7: Node.js
print_step "检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | tr -d 'v')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 16 ]; then
        print_success "Node.js v$NODE_VERSION (符合要求 >= 16.x)"
    else
        print_warning "Node.js 版本过低: v$NODE_VERSION (建议 >= 16.x)"
    fi
    
    # 检查 npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm v$NPM_VERSION"
    fi
else
    print_error "Node.js 未安装"
    echo ""
    print_info "正在安装 Node.js 18.x..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js 安装完成"
fi

# 检查 8: MySQL
print_step "检查 MySQL..."
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version | awk '{print $5}' | tr -d ',')
    print_success "MySQL $MYSQL_VERSION"
    
    # 检查 MySQL 服务状态
    if systemctl is-active --quiet mysql || service mysql status &> /dev/null; then
        print_success "MySQL 服务运行中"
    else
        print_warning "MySQL 服务未运行"
        print_info "尝试启动 MySQL: sudo service mysql start"
    fi
else
    print_error "MySQL 未安装"
    echo ""
    echo "请手动安装 MySQL 8.0:"
    echo "  sudo apt update"
    echo "  sudo apt install mysql-server"
    echo "  sudo mysql_secure_installation"
    exit 1
fi

# 检查 9: PM2
print_step "检查 PM2..."
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    print_success "PM2 v$PM2_VERSION"
else
    print_warning "PM2 未安装"
    print_info "正在安装 PM2..."
    sudo npm install -g pm2
    print_success "PM2 安装完成"
fi

# 检查 10: Git (可选)
print_step "检查 Git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_success "Git $GIT_VERSION"
else
    print_info "Git 未安装（可选）"
fi

echo ""

# ==================== 网络检查阶段 ====================
print_header "🌐 阶段 3: 网络环境检查"

# 检查 11: 端口占用
print_step "检查端口占用..."
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if sudo lsof -i :$port &> /dev/null; then
            local process=$(sudo lsof -i :$port | awk 'NR==2 {print $1}')
            return 1
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            return 1
        fi
    fi
    return 0
}

if check_port 3001; then
    print_success "端口 3001 可用"
else
    print_warning "端口 3001 已被占用"
    print_info "请停止占用进程或修改配置"
fi

if check_port 3306; then
    print_success "端口 3306 可用（或被 MySQL 使用）"
else
    print_info "端口 3306 被占用（MySQL 或其他服务）"
fi

# 检查 12: 网络连通性
print_step "检查网络连通性..."
if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
    print_success "外网连通正常"
else
    print_warning "外网连接失败，部分功能可能受限"
fi

# 检查 13: DNS 解析
print_step "检查 DNS 解析..."
if host github.com &> /dev/null 2>&1 || nslookup github.com &> /dev/null 2>&1; then
    print_success "DNS 解析正常"
else
    print_warning "DNS 解析可能存在问题"
fi

echo ""

# ==================== 配置文件阶段 ====================
print_header "⚙️  阶段 4: 配置文件"

# 创建/检查环境配置
print_step "配置环境变量..."
if [ ! -f "server/.env" ]; then
    print_info "创建 server/.env 文件..."
    cat > server/.env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cheap_window
PORT=3001
NODE_ENV=production
CLIENT_URL=http://localhost:3000
EOF
    print_success "环境配置文件已创建"
    print_warning "⚠️  请修改 server/.env 中的数据库密码！"
else
    print_success "环境配置文件已存在"
    
    # 验证配置完整性
    print_step "验证配置完整性..."
    REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "PORT")
    CONFIG_VALID=true
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" server/.env; then
            print_error "缺少配置项: $var"
            CONFIG_VALID=false
        fi
    done
    
    if [ "$CONFIG_VALID" = true ]; then
        print_success "配置文件验证通过"
    else
        print_error "配置文件不完整，请检查"
        exit 1
    fi
fi

echo ""

# ==================== 数据库阶段 ====================
print_header "🗄️  阶段 5: 数据库初始化"

print_step "检查数据库连接..."

# 从 .env 读取配置
source server/.env

# 测试数据库连接
if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null; then
    print_success "数据库连接成功"
    
    # 检查数据库是否存在
    if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" &> /dev/null; then
        print_success "数据库 $DB_NAME 已存在"
        
        # 检查表是否存在
        TABLE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" 2>/dev/null)
        
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_success "数据库包含 $TABLE_COUNT 个表"
        else
            print_warning "数据库为空，需要初始化"
        fi
    else
        print_info "数据库不存在，正在初始化..."
        mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" < server/init.sql
        print_success "数据库初始化完成"
    fi
else
    print_error "数据库连接失败"
    echo ""
    print_info "请检查以下项目:"
    echo "  1. MySQL 服务是否运行: sudo service mysql status"
    echo "  2. 数据库密码是否正确"
    echo "  3. 用户权限是否足够"
    exit 1
fi

echo ""

# ==================== 依赖安装阶段 ====================
print_header "📦 阶段 6: 安装项目依赖"

# 后端依赖
print_step "安装后端依赖..."
cd server
if npm install --legacy-peer-deps; then
    print_success "后端依赖安装完成"
else
    print_error "后端依赖安装失败"
    exit 1
fi
cd ..

# 前端依赖
print_step "安装前端依赖..."
cd client
if npm install --legacy-peer-deps; then
    print_success "前端依赖安装完成"
else
    print_error "前端依赖安装失败"
    exit 1
fi
cd ..

echo ""

# ==================== 构建阶段 ====================
print_header "🔨 阶段 7: 构建前端"

print_step "开始构建前端..."
cd client
if npm run build; then
    print_success "前端构建成功"
    
    # 复制到服务器
    mkdir -p ../server/public
    cp -r dist/* ../server/public/
    print_success "静态文件已部署到 server/public/"
else
    print_error "前端构建失败"
    exit 1
fi
cd ..

echo ""

# ==================== 准备日志目录 ====================
print_header "📁 阶段 8: 准备日志目录"

print_step "创建日志目录..."
mkdir -p server/logs
chmod 755 server/logs
print_success "日志目录已创建"

echo ""

# ==================== 启动服务阶段 ====================
print_header "🚀 阶段 9: 启动服务"

print_step "使用 PM2 启动服务..."
cd server

# 停止旧服务
if pm2 list | grep -q "cheap-window-server"; then
    print_info "停止旧服务..."
    pm2 stop cheap-window-server 2>/dev/null || true
    pm2 delete cheap-window-server 2>/dev/null || true
fi

# 启动新服务
if pm2 start ecosystem.config.cjs; then
    print_success "服务启动成功"
    pm2 save
    print_success "PM2 配置已保存"
else
    print_error "服务启动失败"
    exit 1
fi

cd ..

echo ""

# ==================== 部署后验证 ====================
print_header "✅ 阶段 10: 部署后验证"

print_step "等待服务启动..."
sleep 3

# 检查服务状态
print_step "检查服务状态..."
if pm2 list | grep -q "cheap-window-server.*online"; then
    print_success "服务运行正常"
else
    print_warning "服务状态异常，请检查日志"
fi

# HTTP 健康检查
print_step "测试 HTTP 接口..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "HTTP API 响应正常"
    else
        print_warning "HTTP API 响应异常 (状态码: $HTTP_CODE)"
    fi
fi

echo ""

# ==================== 部署总结 ====================
print_header "📊 部署总结"

echo -e "检查通过: ${GREEN}$CHECK_PASS${NC}"
echo -e "检查失败: ${RED}$CHECK_FAIL${NC}"
echo -e "警告项目: ${YELLOW}$CHECK_WARN${NC}"
echo ""

if [ $CHECK_FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ 部署成功完成！${NC}"
else
    echo -e "${YELLOW}⚠️  部署完成但存在 $CHECK_FAIL 个问题${NC}"
fi

echo ""
echo "========================================" 
echo "  访问信息"
echo "========================================"
echo ""
echo "  本地访问: http://localhost:3001"

if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "获取失败")
    echo "  公网访问: http://$PUBLIC_IP:3001"
fi

echo ""
echo "========================================" 
echo "  常用命令"
echo "========================================"
echo ""
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs cheap-window-server"
echo "  重启服务: pm2 restart cheap-window-server"
echo "  停止服务: pm2 stop cheap-window-server"
echo "  系统诊断: ./debug_check.sh"
echo ""
echo "========================================" 
echo "  日志文件: $LOG_FILE"
echo "========================================"
echo ""

