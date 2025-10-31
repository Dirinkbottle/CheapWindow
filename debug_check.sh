#!/bin/bash
# CheapWindow 系统诊断脚本
# 快速检查系统状态并定位问题

echo "========================================"
echo "  🔍 CheapWindow 系统诊断工具"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查项计数
PASS=0
FAIL=0

echo "开始诊断..."
echo ""

# ========== 1. 检查 Node.js ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  检查 Node.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js 已安装: $NODE_VERSION"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Node.js 未安装"
    ((FAIL++))
fi
echo ""

# ========== 2. 检查 MySQL ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  检查 MySQL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} MySQL 已安装: $MYSQL_VERSION"
    ((PASS++))
    
    # 检查 MySQL 是否运行
    if sudo service mysql status &> /dev/null; then
        echo -e "${GREEN}✓${NC} MySQL 服务正在运行"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} MySQL 服务未运行"
        echo -e "${YELLOW}  💡 启动命令: sudo service mysql start${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} MySQL 未安装"
    ((FAIL++))
fi
echo ""

# ========== 3. 检查 PM2 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查 PM2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo -e "${GREEN}✓${NC} PM2 已安装: v$PM2_VERSION"
    ((PASS++))
    
    # 检查服务状态
    if pm2 list | grep -q "cheap-window-server"; then
        STATUS=$(pm2 jlist | grep -A 10 "cheap-window-server" | grep '"status"' | cut -d'"' -f4)
        if [ "$STATUS" = "online" ]; then
            echo -e "${GREEN}✓${NC} cheap-window-server 服务运行中"
            ((PASS++))
        else
            echo -e "${RED}✗${NC} cheap-window-server 服务状态: $STATUS"
            echo -e "${YELLOW}  💡 启动命令: pm2 restart cheap-window-server${NC}"
            ((FAIL++))
        fi
    else
        echo -e "${RED}✗${NC} cheap-window-server 服务未启动"
        echo -e "${YELLOW}  💡 启动命令: cd server && pm2 start ecosystem.config.js${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} PM2 未安装"
    echo -e "${YELLOW}  💡 安装命令: npm install -g pm2${NC}"
    ((FAIL++))
fi
echo ""

# ========== 4. 检查端口占用 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  检查端口 3001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v lsof &> /dev/null; then
    PORT_CHECK=$(sudo lsof -i :3001 2>/dev/null)
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${GREEN}✓${NC} 端口 3001 正在使用（服务正在运行）"
        echo "$PORT_CHECK" | head -n 2
        ((PASS++))
    else
        echo -e "${RED}✗${NC} 端口 3001 未被占用（服务未运行）"
        ((FAIL++))
    fi
elif command -v netstat &> /dev/null; then
    PORT_CHECK=$(sudo netstat -nltp 2>/dev/null | grep :3001)
    if [ -n "$PORT_CHECK" ]; then
        echo -e "${GREEN}✓${NC} 端口 3001 正在使用"
        echo "$PORT_CHECK"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} 端口 3001 未被占用"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠${NC} 无法检查端口（lsof/netstat 未安装）"
fi
echo ""

# ========== 5. 检查配置文件 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  检查配置文件"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "server/.env" ]; then
    echo -e "${GREEN}✓${NC} server/.env 配置文件存在"
    echo "   配置内容:"
    cat server/.env | sed 's/DB_PASSWORD=.*/DB_PASSWORD=******/' | sed 's/^/   /'
    ((PASS++))
else
    echo -e "${RED}✗${NC} server/.env 配置文件不存在"
    echo -e "${YELLOW}  💡 请创建 server/.env 文件${NC}"
    ((FAIL++))
fi
echo ""

# ========== 6. 检查数据库连接 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  检查数据库"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "server/.env" ]; then
    DB_NAME=$(grep DB_NAME server/.env | cut -d'=' -f2)
    DB_USER=$(grep DB_USER server/.env | cut -d'=' -f2)
    DB_PASSWORD=$(grep DB_PASSWORD server/.env | cut -d'=' -f2)
    
    # 测试数据库连接
    if mysql -u"$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM messages;" &> /dev/null; then
        MESSAGE_COUNT=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" -se "USE $DB_NAME; SELECT COUNT(*) FROM messages;" 2>/dev/null)
        echo -e "${GREEN}✓${NC} 数据库连接成功"
        echo "   数据库: $DB_NAME"
        echo "   励志话语数量: $MESSAGE_COUNT 条"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} 数据库连接失败"
        echo -e "${YELLOW}  💡 检查数据库密码和数据库是否已创建${NC}"
        echo -e "${YELLOW}  💡 初始化数据库: mysql -u root -p < server/init.sql${NC}"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠${NC} 无法检查（配置文件不存在）"
fi
echo ""

# ========== 7. 检查静态文件 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  检查前端构建"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "server/public" ] && [ -f "server/public/index.html" ]; then
    FILE_COUNT=$(find server/public -type f | wc -l)
    echo -e "${GREEN}✓${NC} 前端已构建并部署"
    echo "   文件数量: $FILE_COUNT 个"
    ((PASS++))
else
    echo -e "${RED}✗${NC} 前端未构建或未部署"
    echo -e "${YELLOW}  💡 构建命令:${NC}"
    echo -e "${YELLOW}     cd client && npm run build && cp -r dist/* ../server/public/${NC}"
    ((FAIL++))
fi
echo ""

# ========== 8. 检查防火墙 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  检查防火墙"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep "3001")
    if [ -n "$UFW_STATUS" ]; then
        echo -e "${GREEN}✓${NC} 防火墙已开放端口 3001"
        echo "$UFW_STATUS" | sed 's/^/   /'
        ((PASS++))
    else
        UFW_ACTIVE=$(sudo ufw status 2>/dev/null | grep "Status: active")
        if [ -n "$UFW_ACTIVE" ]; then
            echo -e "${YELLOW}⚠${NC} 防火墙未开放端口 3001"
            echo -e "${YELLOW}  💡 开放端口: sudo ufw allow 3001/tcp${NC}"
        else
            echo -e "${BLUE}ℹ${NC} 防火墙未启用"
        fi
    fi
else
    echo -e "${BLUE}ℹ${NC} UFW 防火墙未安装"
fi
echo ""

# ========== 9. 测试 HTTP 连接 ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  测试 HTTP 连接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v curl &> /dev/null; then
    HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health 2>/dev/null)
    if [ "$HTTP_TEST" = "200" ]; then
        echo -e "${GREEN}✓${NC} HTTP API 响应正常 (200)"
        HEALTH_DATA=$(curl -s http://localhost:3001/api/health 2>/dev/null)
        echo "   响应数据: $HEALTH_DATA"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} HTTP API 无响应 (状态码: $HTTP_TEST)"
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠${NC} curl 未安装，无法测试"
fi
echo ""

# ========== 10. 获取公网 IP ==========
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔟 公网访问信息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "获取失败")
    echo "   本地访问: http://localhost:3001"
    echo "   公网访问: http://$PUBLIC_IP:3001"
else
    echo -e "${YELLOW}⚠${NC} 无法获取公网 IP（curl 未安装）"
fi
echo ""

# ========== 总结 ==========
echo "========================================"
echo "  📊 诊断结果总结"
echo "========================================"
echo ""
echo -e "通过检查: ${GREEN}$PASS${NC} 项"
echo -e "失败检查: ${RED}$FAIL${NC} 项"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！系统运行正常${NC}"
    echo ""
    echo "🎉 访问地址:"
    echo "   http://localhost:3001"
else
    echo -e "${RED}❌ 发现 $FAIL 个问题，请根据上面的提示修复${NC}"
    echo ""
    echo "📖 常见问题解决方案："
    echo ""
    echo "1. 如果 MySQL 未运行:"
    echo "   sudo service mysql start"
    echo ""
    echo "2. 如果后端服务未启动:"
    echo "   cd server && pm2 start ecosystem.config.js"
    echo ""
    echo "3. 如果数据库未初始化:"
    echo "   mysql -u root -p < server/init.sql"
    echo ""
    echo "4. 如果前端未构建:"
    echo "   cd client && npm run build && cp -r dist/* ../server/public/"
    echo ""
    echo "5. 查看详细日志:"
    echo "   pm2 logs cheap-window-server"
fi
echo ""
echo "========================================"
echo "  需要帮助？查看 DEPLOY_GUIDE.md"
echo "========================================"

