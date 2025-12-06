# WebGL 撕裂效果演示系统

## 概述

这是一个**完整的 WebGL 演示系统**，用于实时调试和展示撕裂动画的各项参数。相比前端实现，本系统提供了更完整的 WebGL 渲染管线和更强大的调试功能。

## 系统特性

### ✨ 完整的 WebGL 实现

- **真实 3D 渲染**：使用 WebGL 1.0 和 GLSL ES 着色器
- **物理引擎**：重力、空气阻力、碰撞检测
- **Voronoi 碎片**：Fortune 算法生成真实碎片
- **裂纹生成**：多层级、分支、生长动画
- **粒子系统**：GPU 加速的 Point Sprites，三种粒子类型
- **Phong 光照**：环境光、方向光、Fresnel 边缘光
- **相机系统**：透视投影、视图矩阵、相机抖动

### 🎮 交互式参数调试

- **80+ 可调参数**：实时修改所有动画参数
- **预设系统**：性能/平衡/质量/极致四种模式
- **实时预览**：即时查看参数变化效果
- **数据库持久化**：保存和加载配置

### 📊 性能监控

- **FPS 显示**：实时帧率监控
- **碎片计数**：显示当前渲染的碎片数量
- **粒子计数**：显示活跃粒子数量
- **动画阶段**：显示当前动画所处阶段

## 架构设计

```
webgl-demo/
├── server.js                    # Express 服务器
├── package.json                 # 依赖管理
├── index.html                   # UI 界面
├── style.css                    # 样式表
├── config-panel.js              # 配置面板逻辑
├── demo.js                      # 主入口
├── core/                        # 核心渲染系统
│   ├── WebGLDemo.js             # 主演示类（动画流程管理）
│   ├── ShaderManager.js         # 着色器编译和管理
│   ├── CameraController.js      # 相机控制器
│   ├── FragmentRenderer.js      # 碎片渲染器（3D 几何体）
│   ├── CrackRenderer.js         # 裂纹渲染器
│   └── ParticleSystem.js        # GPU 粒子系统
├── utils/                       # 工具库
│   ├── voronoi.js               # Voronoi 图生成
│   ├── crackGenerator.js        # 裂纹生成算法
│   ├── matrix3d.js              # 4x4 矩阵运算
│   ├── textureRenderer.js       # 纹理渲染
│   └── physics.js               # 物理引擎
└── shaders/                     # GLSL 着色器
    ├── fragment.vert.js         # 碎片顶点着色器
    ├── fragment.frag.js         # 碎片片段着色器（Phong 光照）
    ├── crack.vert.js            # 裂纹顶点着色器
    ├── crack.frag.js            # 裂纹片段着色器（发光）
    ├── particle.vert.js         # 粒子顶点着色器
    └── particle.frag.js         # 粒子片段着色器（软粒子）
```

## 动画流程

### 五大阶段

1. **CRACKING** (0-30%)
   - 裂纹从冲击点生成并扩散
   - 使用 `generateCrackGrowthAnimation` 实现生长动画
   - 支持多层级、分支、宽度变化

2. **PREPARING** (30-40%)
   - 裂纹完全展开
   - 碎片准备分离
   - 相机抖动触发

3. **EXPLOSION** (40-45%)
   - 碎片开始飞散
   - 粒子系统启动（玻璃、火花、烟雾）
   - 应用初始爆炸力

4. **FLYING** (45-85%)
   - 碎片持续飞行
   - 物理引擎更新（重力、阻力、旋转）
   - 粒子生命周期管理

5. **FADING** (85-100%)
   - 碎片和粒子逐渐消散
   - 透明度线性衰减
   - 动画结束后自动重置

## 技术亮点

### 1. 完整的 WebGL 渲染管线

```javascript
// 顶点着色器示例
attribute vec3 a_position;
uniform mat4 u_mvpMatrix;
void main() {
  gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}

// 片段着色器示例（Phong 光照）
varying vec3 v_normal;
uniform vec3 u_lightDir;
void main() {
  float diffuse = max(dot(normalize(v_normal), u_lightDir), 0.0);
  // ... Fresnel + Ambient + Specular
}
```

### 2. 4x4 矩阵库

- `perspective` - 透视投影矩阵
- `lookAt` - 视图矩阵
- `multiply` - 矩阵乘法
- `inverse` - 逆矩阵（法线变换）
- `createFragmentModelMatrix` - 模型矩阵（TRS）

### 3. Voronoi 碎片生成

- Fortune 算法实现
- Lloyd's 松弛优化
- 多边形简化
- 力场影响计算

### 4. 裂纹生成算法

- 主裂纹：从冲击点向外辐射
- 次级裂纹：分支、弯曲
- 微裂纹：细节填充
- 生长动画：按顺序显示

### 5. GPU 粒子系统

- 使用 Point Sprites 渲染
- 三种粒子类型：
  - **玻璃碎片**：蓝白色，中等速度，寿命长
  - **火花**：橙黄色，高速，短寿命
  - **烟雾**：灰色，低速，长寿命
- Alpha 混合和加法混合

## 启动和使用

### 方式 1：独立启动（推荐）

```bash
cd webgl-demo
npm install
node server.js
# 访问 http://localhost:3002
```

### 方式 2：通过主项目脚本

```bash
# 在项目根目录
./start.sh
# 选择 "4. 仅启动 WebGL 演示服务"
```

### 方式 3：Docker Compose

```bash
# 在项目根目录
./docker-start.sh
# 选择 "是" 启动 webgl-demo 服务
```

## 配置参数

### Voronoi 碎片

- `tear_voronoi_sites` - 初始站点数量
- `tear_voronoi_subdivisions` - 细分次数
- `tear_voronoi_perturbation` - 扰动强度
- `tear_voronoi_relaxation` - Lloyd's 松弛次数

### 裂纹

- `tear_crack_layers` - 裂纹层级（主/次/微）
- `tear_crack_density` - 密度
- `tear_crack_branch_prob` - 分支概率
- `tear_crack_width_min/max` - 宽度范围
- `tear_crack_glow` - 发光强度

### 粒子

- `tear_particle_count` - 总粒子数
- `tear_particle_glass_count` - 玻璃粒子
- `tear_particle_sparkle_count` - 火花粒子
- `tear_particle_smoke_count` - 烟雾粒子
- `tear_particle_lifetime` - 粒子寿命

### 光照

- `tear_ambient_light` - 环境光强度
- `tear_directional_light` - 方向光强度
- `tear_edge_light_intensity` - 边缘光强度
- `tear_light_dir_x/y/z` - 光照方向

### 物理

- `tear_gravity` - 重力加速度
- `tear_air_resistance` - 空气阻力
- `tear_initial_speed_mult` - 初始速度倍数
- `tear_fragment_thickness` - 碎片厚度

### 相机

- `tear_camera_fov` - 视场角
- `tear_camera_distance` - 相机距离
- `tear_camera_shake_intensity` - 抖动强度
- `tear_camera_shake_duration` - 抖动持续时间

## API 接口

### GET `/api/health`
健康检查

### GET `/api/settings`
获取所有配置参数

### POST `/api/settings`
更新配置参数
```json
{
  "tear_particle_count": "100",
  "tear_crack_density": "7"
}
```

## 性能优化

### 1. LOD 系统（可选）
根据碎片大小和距离调整几何体细节

### 2. 视锥剔除（可选）
不渲染视野外的碎片

### 3. 批量渲染
使用缓冲区批量提交顶点数据

### 4. 着色器优化
使用 `mediump` 精度平衡质量和性能

## 调试工具

### 浏览器控制台

```javascript
// 获取当前状态
window.demo.demo.getState()

// 手动触发动画
window.demo.triggerAnimation({ x: 50, y: 50 })

// 重置
window.demo.reset()

// 更新配置
window.demo.updateConfig({ tear_particle_count: '200' })
```

### Chrome DevTools

- **Performance** - 分析渲染性能
- **WebGL Inspector** - 查看 WebGL 调用
- **Memory** - 监控 GPU 内存

## 已知限制

1. **WebGL 1.0**：不支持 `gl.lineWidth` 动态宽度，需在着色器中模拟
2. **移动端**：性能可能较低，建议降低粒子和碎片数量
3. **浏览器兼容性**：需要支持 WebGL 的现代浏览器

## 未来增强

- [ ] WebGL 2.0 支持（Transform Feedback）
- [ ] 后处理特效（Bloom、运动模糊）
- [ ] 多窗口同时撕裂
- [ ] 自定义纹理上传
- [ ] 参数动画录制和回放
- [ ] 高分辨率截图
- [ ] 预设分享系统

## 参考资料

- [WebGL 规范](https://www.khronos.org/webgl/)
- [GLSL ES 规范](https://www.khronos.org/opengles/sdk/docs/man/xhtml/)
- [Voronoi 算法](https://en.wikipedia.org/wiki/Fortune%27s_algorithm)
- [Phong 光照模型](https://en.wikipedia.org/wiki/Phong_reflection_model)

## 许可证

与主项目相同，参见 LICENSE 文件。
