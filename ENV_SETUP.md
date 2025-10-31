# 环境变量配置说明

## 后端环境变量

创建文件：`server/.env`

```env
# ======================
# 数据库配置
# ======================
DB_HOST=localhost          # MySQL主机地址
DB_PORT=3306              # MySQL端口
DB_USER=root              # MySQL用户名
DB_PASSWORD=123456        # MySQL密码（请修改！）
DB_NAME=cheap_window      # 数据库名称

# ======================
# 服务器配置
# ======================
PORT=3001                 # 后端服务端口
NODE_ENV=development      # 环境：development | production

# ======================
# CORS配置
# ======================
CLIENT_URL=http://localhost:3000    # 前端地址（用于CORS）
```

## 前端环境变量（开发环境）

创建文件：`client/.env.development`

```env
# 后端API地址
VITE_API_URL=http://localhost:3001

# WebSocket地址
VITE_SOCKET_URL=http://localhost:3001
```

## 前端环境变量（生产环境）

创建文件：`client/.env.production`

```env
# 后端API地址（修改为实际域名）
VITE_API_URL=https://your-domain.com

# WebSocket地址（修改为实际域名）
VITE_SOCKET_URL=https://your-domain.com
```

## 快速配置脚本

### Linux/Mac

```bash
# 后端配置
cat > server/.env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cheap_window
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
EOF

# 前端开发配置
cat > client/.env.development << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
EOF

echo "✓ 环境变量配置完成！"
echo "⚠️  请修改 server/.env 中的数据库密码！"
```

### Windows (PowerShell)

```powershell
# 后端配置
@"
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cheap_window
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
"@ | Out-File -FilePath server\.env -Encoding UTF8

# 前端开发配置
@"
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
"@ | Out-File -FilePath client\.env.development -Encoding UTF8

Write-Host "✓ 环境变量配置完成！"
Write-Host "⚠️  请修改 server/.env 中的数据库密码！"
```

## 配置说明

### 数据库配置

- **DB_HOST**: MySQL服务器地址
  - 本地开发：`localhost`
  - 远程服务器：实际IP或域名

- **DB_PASSWORD**: MySQL密码
  - ⚠️ **重要**: 务必修改默认密码！
  - 生产环境使用强密码

### 服务器配置

- **PORT**: 后端服务端口
  - 默认3001
  - 确保端口未被占用

- **NODE_ENV**: 运行环境
  - `development`: 开发环境（详细日志）
  - `production`: 生产环境（优化性能）

### CORS配置

- **CLIENT_URL**: 前端地址
  - 开发环境：`http://localhost:3000`
  - 生产环境：`https://your-domain.com`
  - 用于WebSocket CORS验证

## 安全建议

1. **永远不要提交 .env 文件到Git仓库**
   ```bash
   # 确保.gitignore包含
   .env
   server/.env
   client/.env*
   ```

2. **生产环境使用强密码**
   ```bash
   # 生成随机密码示例
   openssl rand -base64 32
   ```

3. **定期更换密码**
   - 建议每3-6个月更换一次数据库密码

4. **使用环境变量管理工具**
   - Docker: 使用secrets
   - Kubernetes: 使用ConfigMap/Secret
   - 云服务: 使用托管的密钥管理服务

## 故障排除

### 数据库连接失败

```bash
# 测试MySQL连接
mysql -h localhost -P 3306 -u root -p

# 检查MySQL服务
sudo systemctl status mysql
```

### 端口被占用

```bash
# 查看3001端口占用
netstat -nltp | grep 3001
# 或
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### CORS错误

确保 `CLIENT_URL` 配置正确，包括协议和端口：
- ✅ `http://localhost:3000`
- ❌ `localhost:3000`
- ❌ `http://localhost:3000/`

## 生产环境检查清单

- [ ] 修改了数据库密码
- [ ] 设置 NODE_ENV=production
- [ ] 配置了正确的域名
- [ ] 启用了HTTPS（如有域名）
- [ ] 设置了强密码策略
- [ ] 配置了防火墙规则
- [ ] 设置了日志轮转
- [ ] 配置了定期备份

---

**配置完成后记得重启服务！**

```bash
pm2 restart cheap-window-server
```

