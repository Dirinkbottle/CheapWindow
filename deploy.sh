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
echo "步骤 1/8: 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js未安装，正在安装...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js已安装: $(node -v)${NC}"
fi

# 2. 检查并安装MySQL
echo ""
echo "步骤 2/8: 检查MySQL..."
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
echo "步骤 3/8: 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2未安装，正在安装...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}✓ PM2已安装${NC}"
fi

# 4. 配置环境变量
echo ""
echo "步骤 4/8: 配置环境变量..."
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
echo "步骤 5/8: 初始化数据库..."
echo "正在执行SQL初始化脚本..."

# 读取密码
read -sp "请输入MySQL root密码: " MYSQL_PASSWORD
echo ""

mysql -u root -p"$MYSQL_PASSWORD" < server/init.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据库初始化成功${NC}"
else
    echo -e "${RED}✗ 数据库初始化失败${NC}"
    exit 1
fi

# 6. 安装依赖
echo ""
echo "步骤 6/8: 安装项目依赖..."

echo "  → 安装后端依赖..."
cd server
npm install
cd ..

echo "  → 安装前端依赖..."
cd client
npm install
cd ..

echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 7. 构建前端
echo ""
echo "步骤 7/8: 构建前端..."
cd client
npm run build
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

# 8. 启动服务
echo ""
echo "步骤 8/8: 启动服务..."
cd server
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}========================================"
echo "  🎉 部署完成！"
echo "========================================${NC}"
echo ""
echo "服务状态: pm2 status"
echo "查看日志: pm2 logs cheap-window-server"
echo "重启服务: pm2 restart cheap-window-server"
echo "停止服务: pm2 stop cheap-window-server"
echo ""
echo "访问地址: http://localhost:3001"
echo ""
echo -e "${YELLOW}注意: 如需外网访问，请配置Nginx反向代理${NC}"
echo ""

