#!/bin/bash

# 多人励志弹窗系统 - 一键部署脚本
# 适用于Ubuntu/Debian系统

set -e  # 遇到错误立即退出

echo "========================================"
echo "  多人励志弹窗系统 - 一键部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
  echo -e "${YELLOW}警告: 建议使用sudo运行此脚本${NC}"
fi

# 1. 检查并安装Node.js
echo "步骤 1/9: 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js未安装，正在安装...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js已安装: $(node -v)${NC}"
fi

# 2. 检查并安装MySQL
echo ""
echo "步骤 2/9: 检查MySQL..."
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}MySQL未安装${NC}"
    echo "请手动安装MySQL 8.0:"
    echo "  sudo apt update"
    echo "  sudo apt install mysql-server"
    echo "  sudo mysql_secure_installation"
    exit 1
else
    echo -e "${GREEN}✓ MySQL已安装${NC}"
fi

# 3. 检查并安装PM2
echo ""
echo "步骤 3/9: 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2未安装，正在安装...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}✓ PM2已安装${NC}"
fi

# 4. 配置环境变量
echo ""
echo "步骤 4/9: 配置环境变量..."
if [ ! -f "server/.env" ]; then
    echo "创建server/.env文件..."
    cat > server/.env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cheap_window
PORT=3001
NODE_ENV=production
CLIENT_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✓ 环境变量已创建${NC}"
    echo -e "${YELLOW}请编辑 server/.env 修改数据库密码等配置！${NC}"
else
    echo -e "${GREEN}✓ 环境变量文件已存在${NC}"
fi

# 5. 初始化数据库
echo ""
echo "步骤 5/9: 初始化数据库..."
echo "正在执行SQL初始化脚本..."

# 读取密码
read -sp "请输入MySQL root密码: " MYSQL_PASSWORD
echo ""

# 执行基础init.sql（使用智能字段管理）
mysql -u root -p"$MYSQL_PASSWORD" < server/init.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库基础表初始化成功${NC}"
else
    echo -e "${RED}✗ 数据库初始化失败${NC}"
    exit 1
fi

# 运行所有迁移脚本
echo "  → 应用数据库迁移..."
MIGRATION_COUNT=0
if [ -d "server/migrations" ]; then
    for migration in server/migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "    应用迁移: $(basename $migration)"
            # 执行迁移并捕获输出，避免脚本挂起
            if mysql -u root -p"$MYSQL_PASSWORD" < "$migration" > /tmp/migration_output.log 2>&1; then
                ((MIGRATION_COUNT++))
                echo "      ✓ 成功"
            else
                MIGRATION_EXIT_CODE=$?
                if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
                    ((MIGRATION_COUNT++))
                    echo "      ✓ 成功"
                else
                    echo -e "${YELLOW}      ⚠ 警告（可能已应用）${NC}"
                    # 显示最后几行输出用于调试
                    if [ -f /tmp/migration_output.log ]; then
                        tail -n 3 /tmp/migration_output.log 2>/dev/null | sed 's/^/        /'
                    fi
                fi
            fi
        fi
    done
    # 清理临时文件
    rm -f /tmp/migration_output.log
    echo -e "${GREEN}✓ 已应用 $MIGRATION_COUNT 个数据库迁移${NC}"
else
    echo -e "${YELLOW}⚠ 未找到migrations目录${NC}"
fi

# 6. 安装依赖
echo ""
echo "步骤 6/11: 安装项目依赖..."

echo "  → 安装后端依赖..."
cd server
npm install
cd ..

echo "  → 安装前端依赖..."
cd client
npm install
cd ..

echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 7. 语法检查
echo ""
echo "步骤 7/11: 语法检查..."
echo "  → 检查前后端代码语法..."

# 检查语法检查脚本是否存在
if [ ! -f "check-syntax-unified.js" ]; then
    echo -e "${YELLOW}⚠ 未找到 check-syntax-unified.js，跳过语法检查${NC}"
else
    if node check-syntax-unified.js; then
        echo -e "${GREEN}✓ 语法检查通过${NC}"
    else
        echo -e "${RED}✗ 语法检查失败，请修复错误后重试${NC}"
        exit 1
    fi
fi

# 8. 构建前端
echo ""
echo "步骤 8/11: 构建前端..."
cd client
# 使用 build:force 或 build，取决于哪个可用
if npm run | grep -q "build:force"; then
    npm run build:force
else
    npm run build
fi
cd ..

if [ -d "client/dist" ]; then
    echo -e "${GREEN}✓ 前端构建成功${NC}"
    
    # 复制构建产物到服务器public目录
    mkdir -p server/public
    cp -r client/dist/* server/public/
    echo "  → 静态文件已复制到server/public/"
else
    echo -e "${RED}✗ 前端构建失败${NC}"
    exit 1
fi

# 9. 准备日志目录
echo ""
echo "步骤 9/11: 准备日志目录..."
mkdir -p server/logs
chmod 755 server/logs
echo -e "${GREEN}✓ 日志目录已创建${NC}"

# 10. 启动主服务
echo ""
echo "步骤 10/11: 启动主服务..."
cd server

# 检查服务是否已运行
if pm2 list | grep -q "cheap-window-server"; then
    echo "  → 检测到服务已运行，重启中..."
    pm2 restart cheap-window-server
else
    echo "  → 首次启动服务..."
    pm2 start ecosystem.config.cjs
fi

cd ..

# 等待服务启动
echo "  → 等待服务启动..."
sleep 5

# 健康检查
echo "  → 执行健康检查..."
HEALTH_CHECK_URL="http://localhost:3001/api/settings"
if curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" | grep -q "200"; then
    echo -e "${GREEN}✓ 主服务健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠ 主服务可能尚未完全启动，请稍后检查${NC}"
fi

# 11. 检查并部署WebGL演示（可选）
echo ""
echo "步骤 11/11: 部署 WebGL 演示服务..."

if [ -d "webgl-demo" ]; then
    echo "  → 检测到 webgl-demo 目录"
    cd webgl-demo
    
    # 检查并安装依赖
    if [ ! -d "node_modules" ]; then
        echo "  → 安装 WebGL 演示依赖..."
        npm install
    else
        echo "  → WebGL 演示依赖已存在"
    fi
    
    # 检查服务是否已运行
    if pm2 list | grep -q "webgl-demo"; then
        echo "  → WebGL 演示服务已运行，重启中..."
        pm2 restart webgl-demo
    else
        echo "  → 首次启动 WebGL 演示服务 (端口3002)..."
        pm2 start server.js --name webgl-demo
    fi
    
    cd ..
    
    # 等待并检查演示服务
    echo "  → 等待服务就绪..."
    sleep 3
    
    # 健康检查
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002/api/health" | grep -q "200"; then
        echo -e "${GREEN}✓ WebGL 演示服务启动成功${NC}"
        WEBGL_DEMO_DEPLOYED=true
    else
        echo -e "${YELLOW}⚠ WebGL 演示服务可能尚未完全启动，请稍后访问 http://localhost:3002${NC}"
        WEBGL_DEMO_DEPLOYED=true
    fi
else
    echo -e "${YELLOW}⚠ 未找到 webgl-demo 目录，跳过 WebGL 演示部署${NC}"
    echo -e "${YELLOW}  如需使用 WebGL 演示，请确保 webgl-demo 目录存在${NC}"
    WEBGL_DEMO_DEPLOYED=false
fi

# 保存PM2配置
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}========================================"
echo "  🎉 部署完成！"
echo "========================================${NC}"
echo ""
echo "📊 服务状态:"
echo "  查看所有服务: pm2 status"
echo "  查看主服务日志: pm2 logs cheap-window-server"
echo "  重启主服务: pm2 restart cheap-window-server"
echo "  停止主服务: pm2 stop cheap-window-server"
echo ""
echo "🌐 访问地址:"
echo "  主应用: http://localhost:3001"

if [ "$WEBGL_DEMO_DEPLOYED" = true ]; then
    echo "  WebGL 演示: http://localhost:3002"
    echo ""
    echo "WebGL 演示管理:"
    echo "  查看演示日志: pm2 logs webgl-demo"
    echo "  重启演示服务: pm2 restart webgl-demo"
    echo "  停止演示服务: pm2 stop webgl-demo"
fi

echo ""
echo "💡 快速命令:"
echo "  查看日志: pm2 logs"
echo "  停止所有: pm2 stop all"
echo "  重启所有: pm2 restart all"
echo ""
echo -e "${YELLOW}⚠️  注意事项:${NC}"
echo "  1. 如需外网访问，请配置 Nginx 反向代理"
echo "  2. 生产环境请修改 server/.env 中的数据库密码"
echo "  3. 建议定期备份数据库: mysqldump cheap_window > backup.sql"
echo ""

