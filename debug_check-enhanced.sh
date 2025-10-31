#!/bin/bash

# CheapWindow 系统诊断脚本 - 增强版 v2.0
# 提供20+项详细检查，生成诊断报告

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 统计
CRITICAL=0
WARNING=0
INFO_COUNT=0
PASS=0

# 报告文件
REPORT_FILE="diagnostic_report_$(date +%Y%m%d_%H%M%S).txt"
JSON_REPORT="diagnostic_report_$(date +%Y%m%d_%H%M%S).json"

# JSON 数据
JSON_DATA='{"timestamp":"'$(date -Iseconds)'","checks":[]}'

# 打印函数
print_header() {
    echo "" | tee -a "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
    echo -e "${CYAN}$1${NC}" | tee -a "$REPORT_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$REPORT_FILE"
    ((PASS++))
}

print_error() {
    echo -e "${RED}✗ [CRITICAL]${NC} $1" | tee -a "$REPORT_FILE"
    ((CRITICAL++))
}

print_warning() {
    echo -e "${YELLOW}⚠ [WARNING]${NC} $1" | tee -a "$REPORT_FILE"
    ((WARNING++))
}

print_info() {
    echo -e "${BLUE}ℹ [INFO]${NC} $1" | tee -a "$REPORT_FILE"
    ((INFO_COUNT++))
}

add_json_check() {
    local category=$1
    local name=$2
    local status=$3
    local message=$4
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg cat "$category" --arg name "$name" --arg status "$status" --arg msg "$message" \
        '.checks += [{"category": $cat, "name": $name, "status": $status, "message": $msg}]' 2>/dev/null || echo "$JSON_DATA")
}

# 开始诊断
clear
print_header "🔍 CheapWindow 系统诊断工具 v2.0"
echo "生成报告: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "开始时间: $(date)" | tee -a "$REPORT_FILE"
echo ""

# ========== 1. 系统信息 ==========
print_header "1️⃣  系统信息检查"

echo "▶ 操作系统" | tee -a "$REPORT_FILE"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "系统: $PRETTY_NAME"
    print_info "版本: $VERSION"
    print_info "架构: $(uname -m)"
else
    print_warning "无法检测操作系统版本"
fi

echo "" | tee -a "$REPORT_FILE"
echo "▶ 硬件信息" | tee -a "$REPORT_FILE"

# CPU
if command -v lscpu &> /dev/null; then
    CPU_MODEL=$(lscpu | grep "Model name:" | cut -d':' -f2 | xargs)
    CPU_CORES=$(lscpu | grep "^CPU(s):" | awk '{print $2}')
    CPU_THREADS=$(lscpu | grep "Thread(s) per core:" | awk '{print $4}')
    print_success "CPU: $CPU_MODEL"
    print_info "核心/线程: $CPU_CORES 核心 x $CPU_THREADS 线程"
else
    CPU_CORES=$(nproc 2>/dev/null || echo "未知")
    print_info "CPU 核心: $CPU_CORES"
fi

# CPU 使用率
if command -v mpstat &> /dev/null; then
    CPU_USAGE=$(mpstat 1 1 | awk '/Average:/ {print 100-$NF"%"}')
    print_info "CPU 使用率: $CPU_USAGE"
elif command -v top &> /dev/null; then
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
    print_info "CPU 使用率: $CPU_USAGE"
fi

# 内存
echo "" | tee -a "$REPORT_FILE"
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
    USED_MEM=$(free -h | awk '/^Mem:/ {print $3}')
    AVAIL_MEM=$(free -h | awk '/^Mem:/ {print $7}')
    MEM_PERCENT=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    print_success "内存总计: $TOTAL_MEM"
    print_info "已用/可用: $USED_MEM / $AVAIL_MEM"
    
    if [ "$MEM_PERCENT" -lt 70 ]; then
        print_success "内存使用率: ${MEM_PERCENT}% (正常)"
    elif [ "$MEM_PERCENT" -lt 85 ]; then
        print_warning "内存使用率: ${MEM_PERCENT}% (偏高)"
    else
        print_error "内存使用率: ${MEM_PERCENT}% (过高)"
    fi
fi

# 磁盘
echo "" | tee -a "$REPORT_FILE"
echo "▶ 磁盘空间" | tee -a "$REPORT_FILE"
df -h | grep -E '^/dev/' | while read line; do
    DISK=$(echo "$line" | awk '{print $1}')
    SIZE=$(echo "$line" | awk '{print $2}')
    USED=$(echo "$line" | awk '{print $3}')
    AVAIL=$(echo "$line" | awk '{print $4}')
    PERCENT=$(echo "$line" | awk '{print $5}' | tr -d '%')
    MOUNT=$(echo "$line" | awk '{print $6}')
    
    if [ "$PERCENT" -lt 80 ]; then
        print_success "$MOUNT: $AVAIL 可用 / $SIZE 总计 (使用 $PERCENT%)"
    elif [ "$PERCENT" -lt 90 ]; then
        print_warning "$MOUNT: $AVAIL 可用 / $SIZE 总计 (使用 $PERCENT%)"
    else
        print_error "$MOUNT: 空间严重不足！仅剩 $AVAIL (使用 $PERCENT%)"
    fi
done

# 系统负载
echo "" | tee -a "$REPORT_FILE"
if command -v uptime &> /dev/null; then
    LOAD_1=$(uptime | awk -F'load average:' '{print $2}' | awk -F, '{print $1}' | xargs)
    LOAD_5=$(uptime | awk -F'load average:' '{print $2}' | awk -F, '{print $2}' | xargs)
    LOAD_15=$(uptime | awk -F'load average:' '{print $2}' | awk -F, '{print $3}' | xargs)
    print_info "系统负载 (1/5/15分钟): $LOAD_1 / $LOAD_5 / $LOAD_15"
    
    if (( $(echo "$LOAD_1 < $CPU_CORES" | bc -l 2>/dev/null || echo 1) )); then
        print_success "系统负载正常"
    else
        print_warning "系统负载偏高"
    fi
fi

# 文件描述符
echo "" | tee -a "$REPORT_FILE"
if [ -f /proc/sys/fs/file-nr ]; then
    FILE_USED=$(cat /proc/sys/fs/file-nr | awk '{print $1}')
    FILE_MAX=$(cat /proc/sys/fs/file-nr | awk '{print $3}')
    print_info "文件描述符: $FILE_USED / $FILE_MAX"
fi

# ========== 2. Node.js 环境 ==========
print_header "2️⃣  Node.js 环境检查"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | tr -d 'v')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_success "Node.js v$NODE_VERSION (推荐版本)"
    elif [ "$NODE_MAJOR" -ge 16 ]; then
        print_success "Node.js v$NODE_VERSION (支持版本)"
    else
        print_warning "Node.js v$NODE_VERSION (版本过低，建议升级到 v16+)"
    fi
    
    # npm 版本
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "npm v$NPM_VERSION"
        
        # npm 缓存检查
        NPM_CACHE=$(npm config get cache)
        print_info "npm 缓存: $NPM_CACHE"
        
        if [ -d "$NPM_CACHE" ]; then
            CACHE_SIZE=$(du -sh "$NPM_CACHE" 2>/dev/null | awk '{print $1}')
            print_info "缓存大小: $CACHE_SIZE"
        fi
    fi
    
    # Node 模块检查
    echo "" | tee -a "$REPORT_FILE"
    echo "▶ 项目依赖检查" | tee -a "$REPORT_FILE"
    
    if [ -d "server/node_modules" ]; then
        BACKEND_MODULES=$(find server/node_modules -maxdepth 1 -type d | wc -l)
        print_success "后端依赖: $BACKEND_MODULES 个模块"
    else
        print_error "后端依赖未安装"
    fi
    
    if [ -d "client/node_modules" ]; then
        FRONTEND_MODULES=$(find client/node_modules -maxdepth 1 -type d | wc -l)
        print_success "前端依赖: $FRONTEND_MODULES 个模块"
    else
        print_error "前端依赖未安装"
    fi
else
    print_error "Node.js 未安装"
    echo "  安装命令: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -" | tee -a "$REPORT_FILE"
fi

# ========== 3. MySQL 检查 ==========
print_header "3️⃣  MySQL 数据库检查"

if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version | awk '{print $5}' | tr -d ',')
    MYSQL_MAJOR=$(echo "$MYSQL_VERSION" | cut -d. -f1)
    
    if [ "$MYSQL_MAJOR" -ge 8 ]; then
        print_success "MySQL $MYSQL_VERSION (推荐版本)"
    elif [ "$MYSQL_MAJOR" -ge 5 ]; then
        print_warning "MySQL $MYSQL_VERSION (建议升级到 8.0+)"
    else
        print_warning "MySQL 版本过低"
    fi
    
    # 服务状态
    echo "" | tee -a "$REPORT_FILE"
    if systemctl is-active --quiet mysql 2>/dev/null || service mysql status &> /dev/null; then
        print_success "MySQL 服务运行中"
        
        # 尝试连接数据库
        if [ -f "server/.env" ]; then
            source server/.env
            
            echo "▶ 数据库连接测试" | tee -a "$REPORT_FILE"
            if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null; then
                print_success "数据库连接成功"
                
                # 检查数据库
                if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" &> /dev/null; then
                    print_success "数据库 '$DB_NAME' 存在"
                    
                    # 表统计
                    TABLE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME'" 2>/dev/null)
                    print_info "数据库包含 $TABLE_COUNT 个表"
                    
                    # 数据统计
                    MESSAGE_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -se "SELECT COUNT(*) FROM $DB_NAME.messages" 2>/dev/null || echo "0")
                    print_info "励志话语数量: $MESSAGE_COUNT 条"
                    
                    SETTING_COUNT=$(mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -se "SELECT COUNT(*) FROM $DB_NAME.settings" 2>/dev/null || echo "0")
                    print_info "系统配置项: $SETTING_COUNT 项"
                    
                    # 表结构检查
                    echo "" | tee -a "$REPORT_FILE"
                    echo "▶ 数据表完整性" | tee -a "$REPORT_FILE"
                    REQUIRED_TABLES=("messages" "settings" "wall_assignments")
                    for table in "${REQUIRED_TABLES[@]}"; do
                        if mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" -se "SHOW TABLES FROM $DB_NAME LIKE '$table'" 2>/dev/null | grep -q "$table"; then
                            print_success "表 '$table' 存在"
                        else
                            print_error "表 '$table' 不存在"
                        fi
                    done
                else
                    print_error "数据库 '$DB_NAME' 不存在"
                    echo "  初始化: mysql -u root -p < server/init.sql" | tee -a "$REPORT_FILE"
                fi
            else
                print_error "数据库连接失败（检查密码和权限）"
            fi
        else
            print_warning "配置文件 server/.env 不存在"
        fi
    else
        print_error "MySQL 服务未运行"
        echo "  启动命令: sudo service mysql start" | tee -a "$REPORT_FILE"
    fi
else
    print_error "MySQL 未安装"
    echo "  安装命令: sudo apt install mysql-server" | tee -a "$REPORT_FILE"
fi

# ========== 4. PM2 服务 ==========
print_header "4️⃣  PM2 服务检查"

if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    print_success "PM2 v$PM2_VERSION"
    
    echo "" | tee -a "$REPORT_FILE"
    echo "▶ 服务状态" | tee -a "$REPORT_FILE"
    
    if pm2 list | grep -q "cheap-window-server"; then
        STATUS=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"pm2_env":' -A 20 | grep '"status"' | cut -d'"' -f4)
        
        if [ "$STATUS" = "online" ]; then
            print_success "cheap-window-server 服务运行中"
            
            # 内存使用
            MEMORY=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"memory":' | awk -F: '{print $2}' | tr -d ' ,' | head -1)
            if [ -n "$MEMORY" ]; then
                MEMORY_MB=$((MEMORY / 1024 / 1024))
                print_info "内存使用: ${MEMORY_MB}MB"
            fi
            
            # CPU 使用
            CPU=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"cpu":' | awk -F: '{print $2}' | tr -d ' ,' | head -1)
            if [ -n "$CPU" ]; then
                print_info "CPU 使用: ${CPU}%"
            fi
            
            # 运行时长
            UPTIME=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"pm_uptime":' | awk -F: '{print $2}' | tr -d ' ,' | head -1)
            if [ -n "$UPTIME" ]; then
                UPTIME_SEC=$(($(date +%s) - UPTIME / 1000))
                UPTIME_HUMAN=$(date -u -d @$UPTIME_SEC +"%H小时%M分钟" 2>/dev/null || echo "$UPTIME_SEC 秒")
                print_info "运行时长: $UPTIME_HUMAN"
            fi
            
            # 重启次数
            RESTARTS=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"restart_time":' | awk -F: '{print $2}' | tr -d ' ,' | head -1)
            if [ -n "$RESTARTS" ]; then
                if [ "$RESTARTS" -eq 0 ]; then
                    print_success "重启次数: $RESTARTS (稳定运行)"
                elif [ "$RESTARTS" -lt 5 ]; then
                    print_info "重启次数: $RESTARTS"
                else
                    print_warning "重启次数: $RESTARTS (频繁重启，检查日志)"
                fi
            fi
        else
            print_error "cheap-window-server 服务状态: $STATUS"
        fi
    else
        print_error "cheap-window-server 服务未启动"
        echo "  启动命令: cd server && pm2 start ecosystem.config.cjs" | tee -a "$REPORT_FILE"
    fi
    
    # 日志检查
    echo "" | tee -a "$REPORT_FILE"
    echo "▶ 日志文件" | tee -a "$REPORT_FILE"
    PM2_HOME=$(pm2 info cheap-window-server 2>/dev/null | grep "pm2 home" | awk '{print $NF}' || echo "$HOME/.pm2")
    
    if [ -d "$PM2_HOME/logs" ]; then
        ERROR_LOG="$PM2_HOME/logs/cheap-window-server-error.log"
        OUT_LOG="$PM2_HOME/logs/cheap-window-server-out.log"
        
        if [ -f "$ERROR_LOG" ]; then
            ERROR_SIZE=$(du -h "$ERROR_LOG" | awk '{print $1}')
            ERROR_LINES=$(wc -l < "$ERROR_LOG" 2>/dev/null || echo 0)
            
            if [ "$ERROR_LINES" -gt 100 ]; then
                print_warning "错误日志: $ERROR_SIZE ($ERROR_LINES 行) - 存在较多错误"
            else
                print_info "错误日志: $ERROR_SIZE ($ERROR_LINES 行)"
            fi
            
            # 最近错误
            RECENT_ERRORS=$(tail -n 5 "$ERROR_LOG" 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
            if [ "$RECENT_ERRORS" -gt 0 ]; then
                print_warning "最近 5 行有 $RECENT_ERRORS 条错误"
            fi
        fi
        
        if [ -f "$OUT_LOG" ]; then
            OUT_SIZE=$(du -h "$OUT_LOG" | awk '{print $1}')
            print_info "输出日志: $OUT_SIZE"
        fi
    fi
else
    print_error "PM2 未安装"
    echo "  安装命令: npm install -g pm2" | tee -a "$REPORT_FILE"
fi

# ========== 5. 网络检查 ==========
print_header "5️⃣  网络环境检查"

# 端口检查
echo "▶ 端口监听状态" | tee -a "$REPORT_FILE"
check_port_listening() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if sudo lsof -i :$port 2>/dev/null | grep -q LISTEN; then
            local process=$(sudo lsof -i :$port | grep LISTEN | awk 'NR==1 {print $1}')
            echo "$process"
            return 0
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln 2>/dev/null | grep -q ":$port .*LISTEN"; then
            echo "进程"
            return 0
        fi
    fi
    return 1
}

if PROC=$(check_port_listening 3001); then
    print_success "端口 3001 监听中 (进程: $PROC)"
else
    print_error "端口 3001 未监听 - 服务未启动"
fi

if PROC=$(check_port_listening 3306); then
    print_success "端口 3306 监听中 (进程: $PROC)"
else
    print_warning "端口 3306 未监听 - MySQL 可能未启动"
fi

# HTTP 测试
echo "" | tee -a "$REPORT_FILE"
echo "▶ HTTP 接口测试" | tee -a "$REPORT_FILE"

if command -v curl &> /dev/null; then
    # 健康检查接口
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null || echo "000")
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "N/A")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "健康检查接口: HTTP $HTTP_CODE (响应时间: ${RESPONSE_TIME}s)"
    else
        print_error "健康检查接口: HTTP $HTTP_CODE (服务异常)"
    fi
    
    # 静态文件测试
    HTTP_CODE_STATIC=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")
    if [ "$HTTP_CODE_STATIC" = "200" ]; then
        print_success "静态文件服务: HTTP $HTTP_CODE_STATIC"
    else
        print_warning "静态文件服务: HTTP $HTTP_CODE_STATIC"
    fi
else
    print_warning "curl 未安装，无法测试 HTTP"
fi

# 网络连通性
echo "" | tee -a "$REPORT_FILE"
echo "▶ 网络连通性" | tee -a "$REPORT_FILE"

if ping -c 1 -W 2 8.8.8.8 &> /dev/null; then
    print_success "外网连通正常"
else
    print_warning "外网连接失败"
fi

if command -v host &> /dev/null || command -v nslookup &> /dev/null; then
    if host github.com &> /dev/null 2>&1 || nslookup github.com &> /dev/null 2>&1; then
        print_success "DNS 解析正常"
    else
        print_warning "DNS 解析异常"
    fi
fi

# 公网 IP
if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s --max-time 3 ifconfig.me 2>/dev/null || curl -s --max-time 3 icanhazip.com 2>/dev/null || echo "无法获取")
    print_info "公网 IP: $PUBLIC_IP"
fi

# ========== 6. 配置文件 ==========
print_header "6️⃣  配置文件检查"

if [ -f "server/.env" ]; then
    print_success "server/.env 配置文件存在"
    
    echo "" | tee -a "$REPORT_FILE"
    echo "▶ 配置内容验证" | tee -a "$REPORT_FILE"
    
    # 必需变量检查
    REQUIRED_VARS=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "PORT")
    ALL_VARS_PRESENT=true
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" server/.env; then
            VALUE=$(grep "^$var=" server/.env | cut -d'=' -f2-)
            if [ "$var" = "DB_PASSWORD" ]; then
                print_success "$var=****"
            else
                print_success "$var=$VALUE"
            fi
        else
            print_error "缺少配置项: $var"
            ALL_VARS_PRESENT=false
        fi
    done
    
    if [ "$ALL_VARS_PRESENT" = true ]; then
        print_success "所有必需配置项都存在"
    fi
    
    # 密码安全检查
    echo "" | tee -a "$REPORT_FILE"
    if grep -q "DB_PASSWORD=123456" server/.env || grep -q "DB_PASSWORD=password" server/.env; then
        print_error "使用默认密码，存在安全风险！"
    else
        print_success "已修改默认密码"
    fi
else
    print_error "server/.env 配置文件不存在"
    echo "  创建命令: cp server/.env.example server/.env" | tee -a "$REPORT_FILE"
fi

# ========== 7. 前端构建 ==========
print_header "7️⃣  前端构建检查"

if [ -d "client/dist" ]; then
    DIST_FILES=$(find client/dist -type f | wc -l)
    DIST_SIZE=$(du -sh client/dist | awk '{print $1}')
    print_success "前端已构建: $DIST_FILES 个文件 ($DIST_SIZE)"
else
    print_warning "前端未构建 (client/dist 不存在)"
fi

if [ -d "server/public" ]; then
    PUBLIC_FILES=$(find server/public -type f | wc -l)
    PUBLIC_SIZE=$(du -sh server/public | awk '{print $1}')
    print_success "静态文件已部署: $PUBLIC_FILES 个文件 ($PUBLIC_SIZE)"
    
    if [ -f "server/public/index.html" ]; then
        print_success "index.html 存在"
    else
        print_error "index.html 不存在"
    fi
else
    print_error "静态文件未部署 (server/public 不存在)"
fi

# ========== 8. 安全检查 ==========
print_header "8️⃣  安全配置检查"

# 防火墙
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
    print_info "UFW 防火墙: $UFW_STATUS"
    
    if sudo ufw status 2>/dev/null | grep -q "3001.*ALLOW"; then
        print_success "端口 3001 已开放"
    else
        if echo "$UFW_STATUS" | grep -q "active"; then
            print_warning "端口 3001 未开放"
        fi
    fi
fi

# 文件权限
echo "" | tee -a "$REPORT_FILE"
echo "▶ 文件权限" | tee -a "$REPORT_FILE"

if [ -f "server/.env" ]; then
    ENV_PERM=$(stat -c %a server/.env 2>/dev/null || stat -f %A server/.env 2>/dev/null)
    if [ "$ENV_PERM" = "600" ] || [ "$ENV_PERM" = "644" ]; then
        print_success ".env 文件权限: $ENV_PERM"
    else
        print_warning ".env 文件权限: $ENV_PERM (建议 600)"
    fi
fi

# ========== 9. 性能测试 ==========
print_header "9️⃣  性能测试"

if command -v curl &> /dev/null && [ "$(check_port_listening 3001)" ]; then
    echo "▶ 响应时间测试 (10次请求)" | tee -a "$REPORT_FILE"
    
    TOTAL_TIME=0
    SUCCESS=0
    
    for i in {1..10}; do
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/api/health 2>/dev/null || echo "0")
        if [ "$RESPONSE_TIME" != "0" ]; then
            TOTAL_TIME=$(echo "$TOTAL_TIME + $RESPONSE_TIME" | bc 2>/dev/null || echo "$TOTAL_TIME")
            ((SUCCESS++))
        fi
    done
    
    if [ "$SUCCESS" -gt 0 ]; then
        AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $SUCCESS" | bc 2>/dev/null || echo "N/A")
        print_success "平均响应时间: ${AVG_TIME}s ($SUCCESS/10 成功)"
        
        if (( $(echo "$AVG_TIME < 0.1" | bc -l 2>/dev/null || echo 0) )); then
            print_success "响应速度: 优秀"
        elif (( $(echo "$AVG_TIME < 0.5" | bc -l 2>/dev/null || echo 0) )); then
            print_info "响应速度: 良好"
        else
            print_warning "响应速度: 偏慢"
        fi
    else
        print_error "所有请求失败"
    fi
fi

# ========== 总结报告 ==========
print_header "📊 诊断总结"

echo -e "${GREEN}✓ 通过: $PASS${NC}" | tee -a "$REPORT_FILE"
echo -e "${YELLOW}⚠ 警告: $WARNING${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}✗ 严重: $CRITICAL${NC}" | tee -a "$REPORT_FILE"
echo -e "${BLUE}ℹ 信息: $INFO_COUNT${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# 健康评分
TOTAL_CHECKS=$((PASS + WARNING + CRITICAL))
if [ "$TOTAL_CHECKS" -gt 0 ]; then
    HEALTH_SCORE=$((PASS * 100 / TOTAL_CHECKS))
    
    echo -n "健康评分: " | tee -a "$REPORT_FILE"
    if [ "$HEALTH_SCORE" -ge 90 ]; then
        echo -e "${GREEN}$HEALTH_SCORE/100 (优秀)${NC}" | tee -a "$REPORT_FILE"
    elif [ "$HEALTH_SCORE" -ge 70 ]; then
        echo -e "${YELLOW}$HEALTH_SCORE/100 (良好)${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${RED}$HEALTH_SCORE/100 (需要改进)${NC}" | tee -a "$REPORT_FILE"
    fi
fi

echo "" | tee -a "$REPORT_FILE"

# 建议
if [ "$CRITICAL" -gt 0 ]; then
    print_header "🔧 修复建议"
    
    if ! command -v mysql &> /dev/null; then
        echo "• 安装 MySQL: sudo apt install mysql-server" | tee -a "$REPORT_FILE"
    fi
    
    if ! pm2 list | grep -q "cheap-window-server.*online"; then
        echo "• 启动服务: cd server && pm2 start ecosystem.config.cjs" | tee -a "$REPORT_FILE"
    fi
    
    if [ ! -d "server/public" ]; then
        echo "• 构建前端: cd client && npm run build && cp -r dist/* ../server/public/" | tee -a "$REPORT_FILE"
    fi
    
    echo "" | tee -a "$REPORT_FILE"
fi

# 快捷命令
print_header "📝 常用命令"
echo "查看服务状态: pm2 status" | tee -a "$REPORT_FILE"
echo "查看实时日志: pm2 logs cheap-window-server" | tee -a "$REPORT_FILE"
echo "重启服务:   pm2 restart cheap-window-server" | tee -a "$REPORT_FILE"
echo "数据库连接: mysql -u root -p" | tee -a "$REPORT_FILE"
echo "访问地址:   http://localhost:3001" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

# 保存 JSON 报告
if command -v jq &> /dev/null; then
    echo "$JSON_DATA" | jq '.' > "$JSON_REPORT" 2>/dev/null
    print_info "JSON 报告已保存: $JSON_REPORT"
fi

print_info "完整报告已保存: $REPORT_FILE"
print_info "诊断完成时间: $(date)"

echo ""
echo "================================================" | tee -a "$REPORT_FILE"

