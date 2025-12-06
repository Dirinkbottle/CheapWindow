# WebGL 撕裂动画 - 使用指南

## 快速开始

### 启用 WebGL 渲染

1. 在浏览器中打开管理面板
2. 导航到设置（Settings）
3. 将 `enable_webgl_rendering` 设置为 `1`
4. 保存设置

系统现在将对所有撕裂动画使用 GPU 加速的 WebGL 渲染！

## 功能特性

### 自动多用户适配

WebGL 系统会根据用户数量自动适配：

- **1 个用户：** 单窗口撕裂
- **2 个用户：** 垂直/水平分割，带真实裂纹效果
- **3 个用户：** 三角形镶嵌
- **4+ 个用户：** 完整 Voronoi 图，动态生成单元格

### 三个动画阶段

**阶段 1：裂纹生成（前 30%）**
- 逐步出现裂纹线条
- 裂纹从用户抓取位置辐射
- 窗口保持完整

**阶段 2：撕裂（30-40%）**
- 窗口开始沿裂纹分离
- 碎片开始形成
- 粒子效果初始化（高质量模式）

**阶段 3：碎片飞散（40-100%）**
- 碎片根据用户施力飞散
- 物理模拟：重力、旋转、淡出
- 粒子扩散和消散

## 配置

### 基础设置

```javascript
// 启用 WebGL（必需）
enable_webgl_rendering: '1'

// 动画持续时间
tear_fragment_lifetime: '3000' // 毫秒

// 淡出持续时间（结束时）
tear_fragment_fade_duration: '1000' // 毫秒
```

### 视觉质量

```javascript
// 启用抗锯齿（更平滑的边缘）
webgl_antialiasing: '1'

// 启用碎片旋转
tear_enable_rotation: '1'

// 启用碎片缩放
tear_enable_scale: '1'
```

### 粒子系统

```javascript
// 生成的粒子数量
tear_particle_count: '50' // 0 表示禁用，100+ 表示戏剧性效果

// 仅在高质量模式下工作
tear_performance_mode: 'high'
```

### 性能调优

**高端设备：**
```javascript
tear_particle_count: '100'
tear_enable_rotation: '1'
tear_enable_scale: '1'
webgl_antialiasing: '1'
```

**低端设备：**
```javascript
tear_particle_count: '20'
tear_enable_rotation: '0'
tear_enable_scale: '0'
webgl_antialiasing: '0'
tear_fragment_lifetime: '2000' // 更短的持续时间
```

## Voronoi 图自定义

Voronoi 图会自动生成，但你可以通过修改 `client/src/utils/voronoi.ts` 来调整：

### 细分控制

```typescript
// 在 generateVoronoiDiagram() 中
subdivisions: 2  // 每个用户的额外单元格数量（推荐 0-4）
```

更多细分 = 更多碎片 = 更戏剧性的效果

### 扰动量

```typescript
perturbation: 10  // 随机偏移像素（推荐 5-20）
```

更高的扰动 = 更不规则、更真实的裂纹

### 简化容差

```typescript
// 在 simplifyPolygon() 中
tolerance: width * 0.02  // 窗口宽度的 2%
```

更低的容差 = 更详细的多边形 = 更高的 GPU 负载

## 浏览器兼容性

### 支持的浏览器

✅ **Chrome 56+**（推荐）  
✅ **Firefox 53+**  
✅ **Safari 11+**  
✅ **Edge 79+**  
✅ **Opera 43+**

### 降级行为

如果不支持 WebGL：
- 系统自动降级到 Canvas 渲染
- 用户看到通知："WebGL不支持，请使用Canvas版本"
- 不会丢失功能，只是性能下降

### 检查 WebGL 支持

打开浏览器控制台并运行：
```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
console.log(gl ? 'WebGL supported' : 'WebGL not supported');
```

## 性能监控

### FPS 计数器

添加到你的代码中以监控性能：
```javascript
let lastTime = Date.now();
let frameCount = 0;

function updateFPS() {
  frameCount++;
  const now = Date.now();
  if (now - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}
updateFPS();
```

### GPU 内存使用

检查 Chrome 开发者工具：
1. F12 → Performance 标签
2. 点击录制
3. 触发撕裂动画
4. 停止录制
5. 在时间线中查找 "GPU"

## 调试

### 启用调试日志

```javascript
// 在 TearEffectWebGL.tsx 中添加 console.logs：
console.log('[TearEffectWebGL] Phase:', phase);
console.log('[TearEffectWebGL] Fragments:', fragments.length);
console.log('[TearEffectWebGL] Particles:', particles.length);
```

### 常见问题

**问题：** 黑屏而不是动画  
**解决方案：** 检查 WebGL 上下文创建，确保画布大小 > 0

**问题：** 碎片不移动  
**解决方案：** 验证 userVectors 是否已填充，检查速度计算

**问题：** 裂纹不可见  
**解决方案：** 检查裂纹不透明度，确保 crackProgram 正确编译

**问题：** 性能差（< 30 FPS）  
**解决方案：** 减少粒子数量，禁用旋转/缩放，检查 GPU 负载

## 高级用法

### 自定义碎片颜色

修改 `TearEffectWebGL.tsx` 中的 `renderFragment()`：

```typescript
// 替代：
const color = hexToRgba(fragment.cell.site.x > 0 ? '#4CAF50' : '#2196F3', 1);

// 使用：
const color = hexToRgba(window.colors.bg, 1); // 使用窗口的原始颜色
```

### 自定义裂纹图案

修改 `voronoi.ts` 中的 `generateCrackLines()` 裂纹生成：

```typescript
// 从中心添加径向裂纹
const center = { x: width / 2, y: height / 2 };
for (let i = 0; i < 8; i++) {
  const angle = (Math.PI * 2 * i) / 8;
  const end = {
    x: center.x + Math.cos(angle) * width,
    y: center.y + Math.sin(angle) * height
  };
  cracks.push([center, end]);
}
```

### 物理自定义

在 `updateFragments()` 中调整重力和空气阻力：

```typescript
// 更强的重力（默认：200）
fragment.velocity.y += 400 * dt;

// 添加空气阻力
fragment.velocity.x *= 0.98;
fragment.velocity.y *= 0.98;
```

## 测试

### 测试多用户场景

```javascript
// 模拟 5 个用户抓取同一个窗口
const testVectors = new Map([
  ['user1', { position: { x: 20, y: 20 }, force: 1.0 }],
  ['user2', { position: { x: 80, y: 20 }, force: 1.2 }],
  ['user3', { position: { x: 50, y: 50 }, force: 0.8 }],
  ['user4', { position: { x: 20, y: 80 }, force: 1.1 }],
  ['user5', { position: { x: 80, y: 80 }, force: 0.9 }]
]);
```

### 性能基准测试

```javascript
const iterations = 100;
const startTime = Date.now();

for (let i = 0; i < iterations; i++) {
  // 生成 Voronoi
  generateVoronoiFast(testVectors, {
    width: 300,
    height: 200
  });
}

const avgTime = (Date.now() - startTime) / iterations;
console.log(`平均 Voronoi 生成时间: ${avgTime.toFixed(2)}ms`);
```

## 语法检查

### 部署前

始终运行语法检查：

```bash
# 从项目根目录
npm run check

# 或仅检查客户端
cd client && npm run check

# 或仅检查服务器
cd server && npm run check
```

### 在 CI/CD 管道中

```yaml
# .github/workflows/deploy.yml
- name: Syntax Check
  run: npm run check
  
- name: Build (only if check passes)
  run: cd client && npm run build
```

## 故障排除

### WebGL 上下文丢失

如果看到 "WebGL context lost" 错误：

1. **降低 GPU 负载：** 减少粒子数量，减少碎片
2. **检查浏览器限制：** 某些浏览器限制 WebGL 上下文
3. **处理上下文丢失：**

```typescript
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.warn('WebGL context lost, attempting restore...');
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  // 重新初始化 WebGL
});
```

### 内存泄漏

如果内存随时间增加：

1. **检查缓冲区删除：** 确保所有 WebGL 缓冲区被删除
2. **检查动画清理：** 验证 `cancelAnimationFrame` 被调用
3. **使用 DevTools 监控：** 使用 Chrome 内存分析器

```typescript
// 始终清理
gl.deleteBuffer(positionBuffer);
gl.deleteBuffer(colorBuffer);
gl.deleteProgram(program);
```

## 支持

如有问题或疑问：
1. 检查浏览器控制台的错误
2. 验证浏览器中的 WebGL 支持
3. 查看设置配置
4. 查看 `IMPLEMENTATION_COMPLETE.md` 了解技术细节

## 性能提示

1. **限制并发动画：** 最多 3-5 个同时撕裂
2. **根据设备调整：** 使用 `navigator.hardwareConcurrency`
3. **监控 FPS：** 如果 FPS < 30 则禁用功能
4. **使用 requestAnimationFrame：** 永远不要使用 setTimeout 做动画
5. **批量 GPU 操作：** 尽可能组合绘制调用

## 下一步

- 尝试不同的设置
- 测试多用户场景
- 监控性能
- 自定义视觉效果
- 集成到你的工作流程

开始撕裂吧！🎉

