# 🌟 多人实时励志弹窗系统

一个基于WebSocket的多人实时互动励志弹窗系统，支持拖动、抛投、抢夺等有趣的交互。

## ✨ 核心特性

- 🎨 **温馨美观** - 柔和的渐变色彩、圆润的边角、优雅的动画
- 🌐 **多人同步** - 所有用户看到完全相同的窗口（位置、内容、动画）
- 🎮 **物理交互** - 拖动、抛投、碰撞反弹，真实物理效果
- 🤝 **抢夺机制** - 多人同时抓取窗口会触发撕裂动画
- 💫 **浮动动画** - 窗口自然浮动，生动活泼
- 📱 **响应式** - 支持PC、平板、手机等多种设备
- ⚙️ **管理后台** - 可配置话语、颜色、系统参数
- 🚀 **高性能** - 60FPS物理引擎，支持10人以下流畅体验

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express** - Web服务器
- **Socket.IO** - WebSocket实时通信
- **MySQL 8.0** - 数据存储
- **物理引擎** - 自研百分比坐标系物理系统

### 前端
- **React 18** + **TypeScript** - UI框架
- **Vite** - 构建工具
- **Socket.IO Client** - WebSocket客户端
- **CSS3 Animations** - 动画效果

### 部署
- **PM2** - 进程管理
- **Nginx** - 反向代理（可选）

## 📦 项目结构

```
CheapWindow/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── index.js       # 服务器主入口
│   │   ├── db.js          # 数据库连接
│   │   ├── models/
│   │   │   └── Message.js # 数据模型
│   │   ├── physicsEngine.js   # 物理引擎
│   │   └── windowManager.js   # 窗口管理器
│   ├── init.sql           # 数据库初始化
│   ├── package.json
│   └── ecosystem.config.js # PM2配置
├── client/                # 前端应用
│   ├── src/
│   │   ├── App.tsx        # 主应用
│   │   ├── components/
│   │   │   ├── PopupWindow.tsx  # 弹窗组件
│   │   │   └── AdminPanel.tsx   # 管理后台
│   │   ├── hooks/
│   │   │   └── useSocket.ts     # WebSocket Hook
│   │   └── utils/
│   │       └── coordinates.ts   # 坐标转换
│   ├── package.json
│   └── vite.config.ts
├── deploy.sh              # 一键部署脚本
└── README.md
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0
- **MySQL** >= 8.0
- **npm** 或 **yarn**

### 方法一：自动部署（推荐）

```bash
# 克隆项目
git clone <repository_url>
cd CheapWindow

# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
sudo bash deploy.sh
```

部署脚本会自动完成：
1. 检查并安装依赖（Node.js, PM2）
2. 配置环境变量
3. 初始化数据库
4. 安装项目依赖
5. 构建前端
6. 启动服务

### 方法二：手动部署

#### 1. 数据库配置

```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source server/init.sql
```

#### 2. 配置环境变量

创建 `server/.env` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的密码
DB_NAME=cheap_window
PORT=3001
NODE_ENV=production
CLIENT_URL=http://localhost:3000
```

#### 3. 安装依赖

```bash
# 后端依赖
cd server
npm install

# 前端依赖
cd ../client
npm install
```

#### 4. 启动开发环境

```bash
# 启动后端（终端1）
cd server
npm run dev

# 启动前端（终端2）
cd client
npm run dev
```

访问 http://localhost:3000

#### 5. 生产环境部署

```bash
# 构建前端
cd client
npm run build

# 复制静态文件
mkdir -p ../server/public
cp -r dist/* ../server/public/

# 启动后端（PM2）
cd ../server
pm2 start ecosystem.config.js
pm2 save
```

## 🎮 使用说明

### 用户端

1. **访问主页** - 打开浏览器访问系统地址
2. **查看窗口** - 窗口会自动生成，最多20个
3. **拖动窗口** - 鼠标按住窗口可拖动
4. **抛投窗口** - 快速拖动并松手可以抛出窗口
5. **碰撞反弹** - 窗口撞到屏幕边缘会反弹
6. **抢夺窗口** - 多人同时抓取同一窗口会触发撕裂

### 管理后台

1. 点击右上角 ⚙️ 按钮进入管理后台
2. **励志话语管理** - 添加、编辑、删除话语
3. **系统配置** - 调整窗口数量、生成间隔等参数

## 🔧 系统配置

在管理后台可配置以下参数：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| max_windows | 最大窗口数量 | 20 |
| interval | 生成间隔（秒） | 0.3 |
| batch_count | 每批生成数量 | 3 |
| font_size | 字体大小 | 14 |
| float_range | 浮动范围（像素） | 5 |

## 📡 WebSocket事件

### 客户端发送

- `grab_window(windowId)` - 抓取窗口
- `drag_window(windowId, position)` - 拖动窗口
- `release_window(windowId, velocity)` - 释放窗口

### 服务器广播

- `sync_windows(windows)` - 同步所有窗口
- `window_created(window)` - 新窗口创建
- `physics_update(updates)` - 物理状态更新（60fps）
- `window_grabbed(windowId, userIds)` - 窗口被抓取
- `window_contested(contestData)` - 抢夺状态
- `window_torn(windowId)` - 窗口撕裂

## 🔒 安全性

- 数据库密码通过环境变量配置
- WebSocket连接支持CORS配置
- 自动清理离线用户的窗口抓取状态

## 🐛 故障排除

### 数据库连接失败

```bash
# 检查MySQL是否运行
sudo systemctl status mysql

# 检查密码是否正确
mysql -u root -p

# 检查数据库是否存在
mysql> SHOW DATABASES;
```

### 前端无法连接后端

- 检查后端是否启动：`pm2 status`
- 检查端口是否被占用：`netstat -nltp | grep 3001`
- 检查防火墙设置

### PM2服务异常

```bash
# 查看日志
pm2 logs cheap-window-server

# 重启服务
pm2 restart cheap-window-server

# 查看详细状态
pm2 describe cheap-window-server
```

## 📝 常用命令

```bash
# PM2管理
pm2 status                          # 查看所有服务
pm2 logs cheap-window-server        # 查看日志
pm2 restart cheap-window-server     # 重启服务
pm2 stop cheap-window-server        # 停止服务
pm2 delete cheap-window-server      # 删除服务

# 开发模式
cd server && npm run dev            # 启动后端开发服务
cd client && npm run dev            # 启动前端开发服务

# 构建
cd client && npm run build          # 构建前端
```

## 🌐 Nginx配置（可选）

如需外网访问，可配置Nginx反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/server/public;
        try_files $uri /index.html;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📮 联系方式

如有问题，请提交Issue或联系开发者。

---

**享受多人互动的乐趣！** 🎉

