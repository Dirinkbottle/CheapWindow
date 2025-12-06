# 项目概览 - 多用户实时励志弹窗系统

**版本：** 第二阶段完成  
**最后更新：** 2025-11-01  
**技术栈：** Node.js + Express + Socket.IO + MySQL + React 18 + TypeScript + WebGL

---

## 1. 系统架构

### 1.1 技术栈
- **后端 (Backend)：** Node.js 18+ + Express + Socket.IO + MySQL 8.0
- **前端 (Frontend)：** React 18 + TypeScript + Vite
- **渲染 (Rendering)：** WebGL（增强版）+ Canvas 2D（降级）
- **多线程 (Multi-threading)：** Web Workers
- **部署 (Deployment)：** PM2 + 可选 Nginx
- **实时通信 (Real-time)：** Socket.IO 用于 WebSocket 通信

### 1.2 架构图
```
┌─────────────────┐        WebSocket         ┌─────────────────┐
│                 │ ◄───────────────────────► │                 │
│   客户端        │                           │   服务器        │
│   (浏览器)      │      HTTP REST API        │   (Node.js)     │
│                 │ ◄───────────────────────► │                 │
└─────────────────┘                           └────────┬────────┘
                                                        │
                                                        │
                                                        ▼
                                                 ┌─────────────┐
                                                 │   MySQL     │
                                                 │   数据库    │
                                                 └─────────────┘
```

### 1.3 性能优化

#### 第一阶段：双根渲染架构
- **问题：** 重型动画阻塞主界面交互
- **解决方案：** 将 React 分为两个根 - 一个用于 UI，一个用于动画
- **结果：** 即使在密集动画期间也能保持流畅交互

#### 第二阶段：WebGL + Workers + 网络优化
- **WebGL 渲染：** GPU 加速的窗口撕裂效果，80+ 个参数
- **Web Workers：** 物理计算卸载到独立线程
- **网络批处理：** WebSocket 消息批处理减少 70% 开销
- **结果：** 支持 10+ 个并发用户，流畅 60 FPS

---

## 2. 文件职责说明

### 2.1 服务器文件 (`server/`)

#### 核心文件
| 文件 | 职责 |
|------|------|
| `src/index.js` | 主服务器入口，Socket.IO 设置，REST API 路由（`/api/messages`，`/api/settings` 等）|
| `src/db.js` | MySQL 连接池，查询封装，连接管理 |
| `src/physicsEngine.js` | 物理模拟（60 FPS tick），碰撞检测，速度计算 |
| `src/windowManager.js` | 窗口生命周期（生成/过期），自动生成，窗口状态管理 |
| `src/wallManager.js` | 墙壁分配逻辑，墙壁捕获处理，边框渲染协调 |
| `src/batchProcessor.js` | WebSocket 消息批处理（第二阶段），减少网络开销 |
| `src/performanceMonitor.js` | 服务器性能跟踪，指标收集 |

#### 模型
| 文件 | 职责 |
|------|------|
| `src/models/Message.js` | 消息 CRUD 操作（创建、读取、更新、删除励志话语）|

#### 配置
| 文件 | 职责 |
|------|------|
| `init.sql` | 数据库架构 + 默认设置（messages、settings 表）|
| `migrations/001_add_dual_root_config.sql` | 添加双根配置字段到 settings |
| `migrations/002_add_webgl_tear_configs.sql` | 添加 80+ WebGL 配置字段到 settings |
| `ecosystem.config.cjs` | PM2 进程配置（重启策略，日志管理）|
| `.env` | 数据库凭证和环境变量（不在仓库中，由部署脚本创建）|

---

### 2.2 客户端文件 (`client/`)

#### 核心组件
| 文件 | 职责 |
|------|------|
| `src/App.tsx` | 主应用根，窗口渲染，用户交互（拖动、抓取、扔出），socket 事件处理 |
| `src/AnimationApp.tsx` | 双根动画应用（撕裂、捕获、墙壁边框）- 隔离的渲染上下文 |
| `src/main.tsx` | 应用引导，双根模式切换，环境检测 |

#### 窗口和管理组件
| 文件 | 职责 |
|------|------|
| `src/components/PopupWindow.tsx` | 单个窗口组件，拖动/抓取逻辑，争夺检测 |
| `src/components/AdminPanel.tsx` | 管理界面，3 个标签：消息管理、系统配置、WebGL 配置（80+ 设置）|
| `src/components/TearEffect.tsx` | Canvas 2D 撕裂动画（基础版，非 WebGL 浏览器的降级方案）|
| `src/components/TearEffectWebGL.tsx` | WebGL 撕裂动画（增强版，1200+ 行，80+ 可配置参数）|
| `src/components/WallCaptureAnimation.tsx` | 窗口碰到指定墙壁时的墙壁捕获动画 |
| `src/components/WallBorders.tsx` | 屏幕边缘彩色边框（上/右/下/左墙壁）|

#### Hooks
| 文件 | 职责 |
|------|------|
| `src/hooks/useSocket.ts` | Socket.IO 连接管理，事件处理器，重连逻辑 |
| `src/hooks/useAnimationWorker.ts` | Web Worker 集成用于物理计算（第二阶段）|
| `src/hooks/useFrameSync.ts` | 双根帧同步（第二阶段）|

#### 工具函数
| 文件 | 职责 |
|------|------|
| `src/utils/coordinates.ts` | 百分比 ↔ 像素转换，支持多屏幕 |
| `src/utils/eventBus.ts` | 应用间事件总线，用于双根通信 |
| `src/utils/AnimationManager.ts` | 动画优先级队列（第二阶段）|
| `src/utils/deviceDetect.ts` | 移动/桌面检测，功能检测 |
| `src/utils/positioning.ts` | 窗口放置逻辑，碰撞避免 |

#### WebGL 工具（第二阶段）
| 文件 | 职责 |
|------|------|
| `src/utils/voronoi.ts` | 使用 Fortune 算法生成 Voronoi 图（用于真实裂纹图案）|
| `src/utils/crackGenerator.ts` | 真实裂纹模拟，带分支和生长动画 |
| `src/utils/textureRenderer.ts` | 窗口内容 → WebGL 纹理转换 |
| `src/utils/matrix3d.ts` | 4x4 矩阵运算用于 3D 变换（MVP 矩阵、透视、lookAt）|

#### Workers
| 文件 | 职责 |
|------|------|
| `src/workers/animationWorker.ts` | 离线程物理计算，保持主线程流畅 |

#### 类型
| 文件 | 职责 |
|------|------|
| `src/types.ts` | TypeScript 接口：`WindowData`、`Settings`、`Message`、`Point` 等 |

---

### 2.3 WebGL 演示 (`webgl-demo/`) - 可选

**用途：** 独立的测试环境，在端口 3002 上运行，用于实验 WebGL 设置

| 文件 | 职责 |
|------|------|
| `server.js` | Express 服务器连接 MySQL，提供演示 UI，暴露 `/api/config` |
| `index.html` | 完整的 WebGL 演示 UI，包含所有 80+ 参数的实时控制 |
| `config-panel.js` | 实时配置 UI 逻辑，滑块/复选框管理 |
| `demo.js` | 独立的 WebGL 撕裂演示（镜像 TearEffectWebGL.tsx）|
| `package.json` | 依赖：express、socket.io、mysql2 |

---

### 2.4 部署文件（根目录）

#### 脚本
| 文件 | 职责 |
|------|------|
| `deploy.sh` | 完整生产部署：安装依赖、初始化数据库、运行迁移、构建前端、启动 PM2 服务 |
| `deploy-enhanced.sh` | 增强部署，带额外验证检查 |
| `start.sh` | 开发快速启动脚本 |
| `debug_check.sh` | 语法 + lint 检查用于调试 |
| `check-syntax-unified.js` | 统一的 JS/TS 语法验证器 |

#### Docker（可选）
| 文件 | 职责 |
|------|------|
| `docker-compose.yml` | MySQL + 应用容器编排 |
| `Dockerfile` | 应用容器定义 |
| `docker/mysql-config.cnf` | MySQL 性能调优 |

---

## 3. 核心系统功能

### 3.1 多用户交互
- **实时窗口同步：** 通过 Socket.IO (WebSocket)
- **抓取/拖动/扔出机制：** 带物理模拟
- **多用户争夺：** 当 2+ 用户抓取同一窗口时，触发撕裂动画
- **可配置争夺阈值：** 默认：2 个用户

### 3.2 墙壁系统
- **4 面墙：** 上、右、下、左
- **用户分配：** 每个用户可分配到 1 面墙
- **捕获机制：** 窗口碰到用户的墙壁会被"捕获"并触发动画
- **视觉反馈：** 屏幕边缘的彩色边框，接近时高亮

### 3.3 撕裂动画模式

| 模式 | 描述 | 使用场景 |
|------|------|----------|
| **Canvas 2D** | 基于简单 voronoi 的撕裂 | 旧浏览器降级，移动端 |
| **WebGL 基础** | GPU 加速 voronoi，基础着色器 | 平衡性能 |
| **WebGL 增强** | 80+ 配置，超真实（Phong 光照、SSAO、运动模糊等）| 高端桌面，演示 |

### 3.4 性能模式

| 模式 | 描述 | 何时使用 |
|------|------|----------|
| **单根 (Single-root)** | 默认 React 渲染 | 简单场景，<5 用户 |
| **双根 (Dual-root)** | 动画在独立根中隔离 | 5+ 用户，重型动画 |
| **Worker 模式** | 物理在 Web Worker 中 | 10+ 用户，极端负载 |

---

## 4. 配置系统

### 4.1 设置类别

#### 1. 窗口生成
- `max_windows`：最大并发窗口数
- `window_generation_interval`：自动生成间隔（毫秒）
- `window_generation_batch_count`：每批生成窗口数

#### 2. 物理
- `physics_fps`：服务器物理 tick 速率
- `gravity`：重力加速度
- `air_resistance`：空气阻力系数
- `friction`：表面摩擦
- `bounce_damping`：碰撞速度损失

#### 3. 撕裂动画（80+ 参数）
**裂纹效果 (Crack Effects)：**
- `tear_crack_layers`、`tear_crack_density`、`tear_crack_glow`、`tear_enable_shadow`
- 扩展：`tear_crack_width_min/max`、`tear_crack_branch_prob`

**3D效果 (3D Effects)：**
- `tear_3d_depth`、`tear_3d_rotation_speed`、`tear_camera_fov`、`tear_camera_distance`

**粒子系统 (Particle System)：**
- `tear_particle_glass_count`、`tear_particle_sparkle_count`、`tear_particle_smoke_count`
- `tear_particle_lifetime_mult`

**视觉特效 (Visual FX)：**
- Bloom：`tear_bloom_threshold`、`tear_bloom_intensity`
- Motion Blur：`tear_motion_blur_samples`、`tear_motion_blur_intensity`
- Chromatic：`tear_chromatic_offset`
- SSAO：`tear_enable_ssao`、`tear_ssao_radius`、`tear_ssao_intensity`

**动画阶段 (Animation Phases)：**
- `tear_phase_cracking/preparing/explosion/flying/fading_ratio`

**纹理 (Texture)：**
- `tear_texture_filtering`（nearest/linear）、`tear_enable_mipmaps`

**碎片 (Fragments)：**
- `tear_fragment_count`、`tear_fragment_thickness`
- `tear_voronoi_subdivisions`、`tear_voronoi_perturbation`

**物理 (Physics)：**
- `tear_gravity`、`tear_air_resistance`、`tear_rotation_damping`、`tear_initial_speed_mult`

**光照 (Lighting)：**
- `tear_lighting_intensity`、`tear_ambient_light`、`tear_directional_light`
- 光源方向：`tear_light_dir_x/y/z`
- 边缘光：`tear_enable_edge_light`、`tear_edge_light_intensity`

**相机 (Camera)：**
- 抖动：`tear_enable_camera_shake`、`tear_camera_shake_intensity/duration`
- 跟踪：`tear_enable_camera_tracking`、`tear_camera_tracking_smooth`

**性能 (Performance)：**
- LOD：`tear_enable_lod`、`tear_lod_distance_near/far`
- `tear_enable_culling`

#### 4. 墙壁系统
- `enable_wall_system`：主开关
- `wall_top/right/bottom/left_color`：边框颜色
- `wall_border_width`：边框厚度（px）
- `wall_proximity_threshold`：高亮距离（%）

#### 5. 性能
- `enable_gpu_acceleration`：使用 requestAnimationFrame
- `enable_webgl_rendering`：使用 WebGL 进行撕裂
- `broadcast_throttle`：Socket 广播间隔（毫秒）
- `websocket_batch_enabled`：启用消息批处理

#### 6. 双根
- `enable_dual_root`：分离渲染
- `drag_throttle_enabled`：节流拖动事件

### 4.2 管理面板标签

#### 标签 1：励志话语管理 (Message Management)
- 添加/编辑/删除励志话语
- 为每条消息设置背景/文字颜色
- 列表视图预览

#### 标签 2：系统配置 (System Config)
- 窗口生成设置
- 物理参数
- 墙壁系统配置
- 性能开关

#### 标签 3：WebGL撕裂效果 (WebGL Tear Effects)
- 4 个快速预设：性能、平衡、质量、极致
- 80+ 参数按可折叠组组织
- "全部展开/折叠"开关
- 实时预览（如果 webgl-demo 正在运行）

---

## 5. 部署工作流

### 5.1 快速开始（开发）
```bash
# 终端 1：启动后端
cd server
npm install
npm run dev

# 终端 2：启动前端
cd client
npm install
npm run dev
```

### 5.2 生产部署
```bash
chmod +x deploy.sh
sudo bash deploy.sh
```

**它做什么：**
1. 检查/安装 Node.js、MySQL、PM2
2. 创建 `.env` 文件（提示输入 MySQL 密码）
3. 使用 `init.sql` 初始化数据库
4. 从 `server/migrations/` 应用所有迁移
5. 安装服务器 + 客户端依赖
6. 运行语法检查
7. 使用 Vite 构建前端
8. 复制构建到 `server/public/`
9. 使用 PM2 启动服务器
10. 在端口 3001 上运行健康检查
11. （可选）如果目录存在，在端口 3002 上部署 webgl-demo

### 5.3 服务
- **主应用：** `http://localhost:3001`
- **WebGL 演示：** `http://localhost:3002`（如果已部署）
- **PM2 命令：**
  - `pm2 status` - 检查服务状态
  - `pm2 logs cheap-window-server` - 查看日志
  - `pm2 restart cheap-window-server` - 重启
  - `pm2 stop cheap-window-server` - 停止

---

## 6. WebGL 撕裂动画详情

### 6.1 动画流水线

```
检测到用户争夺
        ↓
1. 裂纹生成 (CRACKING)（时间的 30%）
   - 使用裂纹生成器生成真实裂纹
   - 从冲击点动画裂纹生长
   - 在裂纹边缘应用发光效果
        ↓
2. 准备阶段 (PREPARING)（时间的 10%）
   - 生成 Voronoi 碎片
   - 创建 3D 几何体（顶点、UV、法线）
   - 开始轻微分离
        ↓
3. 爆炸瞬间 (EXPLOSION)（时间的 5%）
   - 应用爆炸力倍增器
   - 生成粒子（玻璃碎片、火花、烟雾）
   - 相机抖动（如果启用）
        ↓
4. 飞散阶段 (FLYING)（时间的 40%）
   - 物理模拟（重力、空气阻力、旋转）
   - 3D 变换（平移、旋转、缩放）
   - 粒子更新
   - 可选的相机跟踪
        ↓
5. 消散阶段 (FADING)（时间的 15%）
   - 不透明度淡出
   - 继续物理
   - 粒子清理
        ↓
   动画完成
```

### 6.2 WebGL 着色器

#### 主着色器（3D 碎片）
- **顶点着色器：** MVP 变换，法线变换
- **片段着色器：** Phong 光照模型，Fresnel 边缘光，纹理映射

#### 裂纹着色器
- **顶点着色器：** 2D 线条渲染
- **片段着色器：** 裂纹颜色 + 发光效果

#### 粒子着色器
- **顶点着色器：** 点精灵渲染
- **片段着色器：** 圆形粒子，柔和边缘

### 6.3 关键技术
- **Voronoi 图：** Fortune 算法用于真实破碎图案
- **裂纹生成：** 递归分支，带物理约束
- **纹理捕获：** `renderWindowToTexture()` 将 DOM → WebGL 纹理
- **3D 数学：** 自定义矩阵库用于 MVP 计算（无 THREE.js 依赖）
- **Phong 光照：** 环境光 + 漫反射 + 镜面反射
- **粒子系统：** 基于 GPU 的点精灵，带物理

---

## 7. 测试

参见 [TESTING_GUIDE.md](TESTING_GUIDE.md) 了解：
- 双根模式测试程序
- 性能基准
- 多用户测试场景
- 网络模拟测试

参见 [WEBGL_USAGE_GUIDE.md](WEBGL_USAGE_GUIDE.md) 了解：
- WebGL 配置指南
- 参数调优建议
- WebGL 问题排查

---

## 8. 已知限制

### 8.1 可扩展性
- **推荐：** 最多 10 个并发用户
- **原因：** 物理模拟和 socket 广播线性扩展
- **解决方法：** 使用 worker 模式，启用批处理，减少物理 FPS

### 8.2 安全性
- **⚠️ 无身份验证：** AdminPanel 对所有人开放
- **⚠️ SQL 注入风险：** AIGC 生成的代码，有限的输入验证
- **⚠️ 无速率限制：** 容易被滥用
- **建议：** 在身份验证层后部署（Nginx auth、VPN 等）

### 8.3 浏览器兼容性
- **WebGL：** 需要 Chrome 56+、Firefox 53+、Safari 11+
- **移动端：** 低端设备性能有限
- **降级：** 如果 WebGL 不可用，自动切换到 Canvas 2D

### 8.4 已知 Bug
- **双根同步：** 根之间罕见的不同步（1-2% 的情况）
- **WebSocket 重连：** 重连期间可能丢失状态
- **高 DPI 显示器：** 纹理分辨率可能需要调整

---

## 9. 未来增强（可选）

### 9.1 渲染
- [ ] THREE.js 集成用于高级 3D 效果
- [ ] OffscreenCanvas 用于 Worker 渲染
- [ ] 后处理管道（bloom、DOF 等）

### 9.2 功能
- [ ] 用户身份验证系统
- [ ] 持久化用户配置文件
- [ ] 聊天系统
- [ ] 排行榜（最多捕获）

### 9.3 性能
- [ ] Redis 用于状态缓存
- [ ] 数据库连接池改进
- [ ] CDN 用于静态资源

### 9.4 DevOps
- [ ] CI/CD 管道
- [ ] 自动化测试套件
- [ ] 监控仪表板（Grafana + Prometheus）

---

## 10. 快速参考

### 常见任务

**添加新的 WebGL 设置：**
1. 在 `server/migrations/` SQL 文件中添加字段
2. 添加到 `client/src/types.ts` 的 `Settings` 接口
3. 在 `client/src/components/AdminPanel.tsx` 中添加 UI 控件
4. 添加到所有 4 个预设配置
5. 在 `client/src/components/TearEffectWebGL.tsx` 中使用

**更新数据库架构：**
1. 在 `server/migrations/` 中创建新文件：`00X_description.sql`
2. 编写迁移 SQL（使用 `ON DUPLICATE KEY UPDATE` 实现幂等性）
3. 运行 `sudo bash deploy.sh` - 迁移自动应用

**调试性能问题：**
1. 检查 `pm2 logs cheap-window-server`
2. 打开浏览器 DevTools → Performance 标签
3. 切换 `enable_dual_root`、`enable_webgl_rendering`
4. 减少 `physics_fps`、`broadcast_throttle`

**重置数据库：**
```bash
mysql -u root -p
DROP DATABASE cheap_window;
CREATE DATABASE cheap_window;
USE cheap_window;
source server/init.sql;
# 然后手动应用迁移
source server/migrations/001_add_dual_root_config.sql;
source server/migrations/002_add_webgl_tear_configs.sql;
```

---

**项目状态：** ✅ 第二阶段完成  
**最后重大更新：** 增强的 WebGL 系统，80+ 可配置参数  
**下一阶段：** 第三阶段（可选）- 高级功能（见第 9 节）

---

详细使用说明，请参阅：
- [README.md](README.md) - 入门指南
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - 测试程序
- [WEBGL_USAGE_GUIDE.md](WEBGL_USAGE_GUIDE.md) - WebGL 配置

