/**
 * WebGL 演示入口文件
 * 连接 HTML UI 和 WebGL 渲染系统
 */

// 动态导入核心模块
let WebGLDemoModule = null;

// 主演示类（非模块版本）
class WebGLDemo {
  constructor() {
    this.canvas = document.getElementById('previewCanvas');
    this.demo = null;
    this.currentConfig = {};
    this.isInitialized = false;
    
    console.log('🎬 WebGL Demo 开始初始化...');
    
    this.init();
  }

  async init() {
    try {
      // 加载配置
      await this.loadConfig();
      
      // 动态导入核心模块
      const module = await import('./core/WebGLDemo.js');
      WebGLDemoModule = module.WebGLDemo;
      
      // 创建核心演示实例
      this.demo = new WebGLDemoModule(this.canvas, this.currentConfig);
      this.isInitialized = true;
      
      // 绑定UI事件
      this.bindEvents();
      
      // 启动状态更新
      this.startStatusUpdates();
      
      console.log('✅ WebGL Demo 初始化完成');
      showToast('WebGL 系统初始化成功', 'success');
      
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      showToast('初始化失败: ' + error.message, 'error');
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        this.currentConfig = settings.reduce((acc, s) => {
          acc[s.key] = s.value;
          return acc;
        }, {});
        console.log('✓ 配置加载成功:', Object.keys(this.currentConfig).length, '项');
      } else {
        console.warn('无法加载配置，使用默认值');
      }
    } catch (error) {
      console.warn('配置加载失败:', error);
    }
  }

  bindEvents() {
    // 触发按钮
    const triggerBtn = document.getElementById('triggerBtn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        this.triggerAnimation();
      });
    }
    
    // 重置按钮
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }
    
    // 画布点击
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      this.triggerAnimation({ x, y });
    });
    
    // 监听配置变化
    window.addEventListener('configUpdate', (e) => {
      if (e.detail) {
        this.updateConfig(e.detail);
      }
    });
    
    // 监听批量配置更新
    window.addEventListener('configBatchUpdate', (e) => {
      if (e.detail) {
        this.updateConfig(e.detail);
      }
    });
  }

  triggerAnimation(clickPos = null) {
    if (!this.isInitialized || !this.demo) {
      showToast('系统未初始化', 'warning');
      return;
    }
    
    // 隐藏提示遮罩
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // 默认中心位置
    const pos = clickPos || { x: 50, y: 50 };
    
    console.log('🎬 触发动画于:', pos);
    this.demo.startAnimation(pos);
    
    // 更新状态显示
    this.updateAnimState('运行中');
  }

  reset() {
    if (!this.isInitialized || !this.demo) return;
    
    console.log('🔄 重置动画');
    this.demo.reset();
    this.updateAnimState('待机');
    
    // 显示提示遮罩
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  updateConfig(config) {
    this.currentConfig = { ...this.currentConfig, ...config };
    if (this.demo) {
      this.demo.updateConfig(this.currentConfig);
      console.log('✓ 配置已更新');
    }
  }

  startStatusUpdates() {
    setInterval(() => {
      if (this.demo && this.isInitialized) {
        const state = this.demo.getState();
        
        // 更新碎片和粒子计数
        const fragCountEl = document.getElementById('fragCount');
        if (fragCountEl) {
          fragCountEl.textContent = state.fragmentCount;
        }
        
        const particleCountEl = document.getElementById('particleCount');
        if (particleCountEl) {
          particleCountEl.textContent = state.particleCount;
        }
        
        // 更新FPS
        const fpsEl = document.getElementById('fps');
        if (fpsEl) {
          fpsEl.textContent = `FPS: ${state.fps}`;
        }
        
        // 更新动画状态
        if (state.phase && state.phase !== 'idle') {
          this.updateAnimState(this.getPhaseText(state.phase));
        } else {
          this.updateAnimState('待机');
        }
      }
    }, 100);
  }

  getPhaseText(phase) {
    const phaseMap = {
      'cracking': '裂纹生成',
      'preparing': '准备爆炸',
      'explosion': '爆炸瞬间',
      'flying': '碎片飞行',
      'fading': '逐渐消散'
    };
    return phaseMap[phase] || '运行中';
  }

  updateAnimState(text) {
    const animStateEl = document.getElementById('animState');
    if (animStateEl) {
      animStateEl.textContent = text;
    }
  }
}

// 全局导出
if (typeof window !== 'undefined') {
  window.WebGLDemo = WebGLDemo;
}

// 自动初始化标志
console.log('✓ demo.js 已加载');
