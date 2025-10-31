# 快速开始指南

## 本地开发环境搭建

### 1. 准备工作

确保已安装：
- Node.js >= 18.0
- MySQL >= 8.0
- npm 或 yarn

### 2. 数据库初始化

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库并导入数据
source server/init.sql

# 或者直接执行
mysql -u root -p < server/init.sql
```

### 3. 配置后端

创建 `server/.env` 文件：

```bash
cd server
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=cheap_window
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
EOF
```

修改 `DB_PASSWORD` 为你的MySQL密码。

### 4. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd ../client
npm install
```

### 5. 启动开发服务

**终端1 - 启动后端：**
```bash
cd server
npm run dev
```

看到以下输出表示成功：
```
✓ 数据库连接成功
✓ 服务器运行在: http://localhost:3001
✓ WebSocket服务已启用
```

**终端2 - 启动前端：**
```bash
cd client
npm run dev
```

看到：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

### 6. 访问应用

打开浏览器访问：http://localhost:3000

可以打开多个浏览器标签页测试多人互动功能！

## 测试多人功能

1. 在浏览器中打开多个标签页
2. 每个标签页都是一个独立用户
3. 尝试在不同标签页中抓取、拖动同一个窗口
4. 观察窗口的抖动和撕裂效果

## 常见问题

### Q: 数据库连接失败？
A: 检查MySQL是否启动，密码是否正确：
```bash
sudo systemctl status mysql
mysql -u root -p
```

### Q: 前端连接不上后端？
A: 确保后端已启动在3001端口，检查控制台错误信息。

### Q: 看不到窗口生成？
A: 
1. 检查浏览器控制台是否有WebSocket连接成功的日志
2. 查看后端控制台是否有用户连接的日志
3. 检查数据库中是否有励志话语数据

### Q: 窗口不同步？
A: 
1. 确保使用了同一个后端服务器
2. 检查WebSocket连接状态（页面左上角）
3. 查看浏览器控制台和后端日志

## 开发建议

1. **修改代码后自动重启**
   - 后端使用nodemon，保存后自动重启
   - 前端使用Vite HMR，修改即时生效

2. **调试技巧**
   - 打开浏览器开发者工具（F12）
   - 查看Network标签中的WebSocket连接
   - 后端日志会输出所有事件

3. **添加新话语**
   - 点击右上角⚙️进入管理后台
   - 在"励志话语管理"中添加
   - 或直接在数据库中插入

## 下一步

- 阅读完整的 [README.md](README.md)
- 查看 [架构设计文档](web-.plan.md)
- 开始自定义功能开发

祝开发愉快！ 🎉

