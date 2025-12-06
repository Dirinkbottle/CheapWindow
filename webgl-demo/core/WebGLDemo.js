/**
 * WebGL 演示主类
 * 统一管理所有渲染器，实现完整的撕裂动画流程
 */

import { ShaderManager } from './ShaderManager.js';
import { CameraController } from './CameraController.js';
import { CrackRenderer } from './CrackRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';
import { FragmentRenderer } from './FragmentRenderer.js';
import { generateVoronoiFast } from '../utils/voronoi.js';
import { generateRealisticCracks, generateCrackGrowthAnimation } from '../utils/crackGenerator.js';

// 动画阶段
const AnimationPhase = {
  IDLE: 'idle',
  CRACKING: 'cracking',
  PREPARING: 'preparing',
  EXPLOSION: 'explosion',
  FLYING: 'flying',
  FADING: 'fading'
};

export class WebGLDemo {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    
    // 初始化 WebGL
    this.gl = this.initWebGL();
    if (!this.gl) {
      console.error('WebGL 初始化失败');
      return;
    }
    
    // 创建管理器
    this.shaderManager = new ShaderManager(this.gl);
    this.camera = new CameraController(canvas, config);
    
    // 创建渲染器
    this.crackRenderer = new CrackRenderer(this.gl, this.shaderManager, config);
    this.particleSystem = new ParticleSystem(this.gl, this.shaderManager, config);
    this.fragmentRenderer = new FragmentRenderer(this.gl, this.shaderManager, this.camera, config);
    
    // 动画状态
    this.isAnimating = false;
    this.phase = AnimationPhase.IDLE;
    this.startTime = 0;
    this.animationId = null;
    
    // 裂纹动画
    this.crackAnimator = null;
    this.cracks = [];
    
    // FPS 计数
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    
    // 调整画布大小
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    console.log('✓ WebGL 演示系统初始化成功');
  }

  /**
   * 初始化 WebGL
   */
  initWebGL() {
    try {
      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        antialias: this.config.webgl_antialiasing === '1',
        depth: true,
        premultipliedAlpha: false
      });

      if (!gl) {
        throw new Error('WebGL 不支持');
      }

      // 启用扩展
      gl.getExtension('OES_standard_derivatives');
      
      console.log('✓ WebGL 上下文创建成功');
      return gl;
    } catch (error) {
      console.error('WebGL 初始化错误:', error);
      return null;
    }
  }

  /**
   * 调整画布大小
   */
  resizeCanvas() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    if (this.camera) {
      this.camera.updateMatrices();
    }
  }

  /**
   * 开始动画
   */
  startAnimation(clickPos = null) {
    if (this.isAnimating) return;

    console.log('🎬 开始 WebGL 动画');

    this.isAnimating = true;
    this.startTime = Date.now();
    this.phase = AnimationPhase.CRACKING;
    
    // 生成冲击点
    const impactPoint = {
      x: clickPos ? clickPos.x : 50,
      y: clickPos ? clickPos.y : 50
    };
    
    // 生成裂纹
    this.generateCracks(impactPoint);
    
    // 生成碎片（但先不显示）
    this.generateFragments(impactPoint);
    
    // 触发相机抖动
    if (this.camera) {
      this.camera.triggerShake();
    }
    
    // 开始渲染循环
    this.animate();
  }

  /**
   * 生成裂纹
   */
  generateCracks(impactPoint) {
    const bounds = {
      width: this.canvas.width,
      height: this.canvas.height
    };
    
    const impactX = (impactPoint.x / 100) * bounds.width;
    const impactY = (impactPoint.y / 100) * bounds.height;
    
    const options = {
      layers: parseInt(this.config.tear_crack_layers || 3),
      density: parseFloat(this.config.tear_crack_density || 5) / 5,
      mainCrackCount: 8,
      branchProbability: parseFloat(this.config.tear_crack_branch_prob || 0.3),
      minWidth: parseFloat(this.config.tear_crack_width_min || 1),
      maxWidth: parseFloat(this.config.tear_crack_width_max || 3),
      maxLength: Math.min(bounds.width, bounds.height) * 0.4,
      glowIntensity: parseFloat(this.config.tear_crack_glow || 1),
      shadowDepth: parseFloat(this.config.tear_enable_shadow === '1' ? 2 : 0)
    };
    
    this.cracks = generateRealisticCracks(
      [{ x: impactX, y: impactY }],
      bounds,
      options
    );
    
    // 创建裂纹生长动画
    const crackDuration = parseFloat(this.config.tear_fragment_lifetime || 3000) * 0.3;
    this.crackAnimator = generateCrackGrowthAnimation(this.cracks, crackDuration);
    
    // 设置到渲染器
    this.crackRenderer.setCracks(this.cracks);
  }

  /**
   * 生成碎片
   */
  generateFragments(impactPoint) {
    const bounds = {
      width: this.canvas.width,
      height: this.canvas.height
    };
    
    // 模拟用户向量
    const userVectors = [{
      userId: 'demo',
      position: impactPoint,
      force: 1.0
    }];
    
    // 生成 Voronoi 碎片
    const cells = generateVoronoiFast(userVectors, {
      width: bounds.width,
      height: bounds.height,
      subdivisions: parseInt(this.config.tear_voronoi_subdivisions || 2),
      perturbation: parseFloat(this.config.tear_voronoi_perturbation || 10)
    });
    
    // 生成碎片
    const center = {
      x: (impactPoint.x / 100) * bounds.width - bounds.width / 2,
      y: (impactPoint.y / 100) * bounds.height - bounds.height / 2,
      z: 0
    };
    
    this.fragmentRenderer.generateFragments(cells, bounds, center);
  }

  /**
   * 主动画循环
   */
  animate() {
    if (!this.isAnimating) return;

    const now = Date.now();
    const elapsed = now - this.startTime;
    const lifetime = parseFloat(this.config.tear_fragment_lifetime || 3000);
    const progress = Math.min(elapsed / lifetime, 1);
    const dt = 1 / 60; // 假设 60 FPS

    // 更新 FPS
    this.updateFPS(now);

    // 清除画布
    const gl = this.gl;
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 根据进度更新阶段
    this.updatePhase(progress);

    // 更新相机
    if (this.camera) {
      this.camera.update(dt);
    }

    // 渲染当前阶段
    this.renderPhase(elapsed);

    // 检查是否结束
    if (progress >= 1) {
      this.reset();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * 更新动画阶段
   */
  updatePhase(progress) {
    if (progress < 0.3) {
      this.phase = AnimationPhase.CRACKING;
    } else if (progress < 0.4) {
      this.phase = AnimationPhase.PREPARING;
    } else if (progress < 0.45) {
      this.phase = AnimationPhase.EXPLOSION;
    } else if (progress < 0.85) {
      this.phase = AnimationPhase.FLYING;
    } else {
      this.phase = AnimationPhase.FADING;
    }
  }

  /**
   * 渲染当前阶段
   */
  renderPhase(elapsed) {
    const dt = 1 / 60;
    
    switch (this.phase) {
      case AnimationPhase.CRACKING:
        this.renderCracking(elapsed);
        break;
        
      case AnimationPhase.PREPARING:
        this.renderPreparing();
        break;
        
      case AnimationPhase.EXPLOSION:
        this.renderExplosion(dt);
        break;
        
      case AnimationPhase.FLYING:
        this.renderFlying(dt);
        break;
        
      case AnimationPhase.FADING:
        this.renderFading(dt, elapsed);
        break;
    }
  }

  /**
   * 渲染裂纹阶段
   */
  renderCracking(elapsed) {
    if (!this.crackAnimator) return;
    
    const frame = this.crackAnimator(elapsed);
    const resolution = {
      width: this.canvas.width,
      height: this.canvas.height
    };
    
    this.crackRenderer.render(frame.visibleSegments, resolution);
  }

  /**
   * 渲染准备阶段
   */
  renderPreparing() {
    // 裂纹完全可见
    const allSegments = [];
    this.cracks.forEach(crack => {
      crack.segments.forEach(segment => {
        allSegments.push({ segment, progress: 1 });
      });
    });
    
    const resolution = {
      width: this.canvas.width,
      height: this.canvas.height
    };
    
    this.crackRenderer.render(allSegments, resolution);
  }

  /**
   * 渲染爆炸阶段
   */
  renderExplosion(dt) {
    // 生成粒子
    if (this.particleSystem.getParticleCount() === 0) {
      const count = parseInt(this.config.tear_particle_count || 50);
      this.particleSystem.generateParticles(
        { x: 0, y: 0, z: 0 },
        count,
        this.config
      );
    }
    
    // 更新和渲染
    this.fragmentRenderer.update(dt);
    this.particleSystem.update(dt);
    
    this.fragmentRenderer.render();
    this.particleSystem.render(this.camera.getVPMatrix());
  }

  /**
   * 渲染飞行阶段
   */
  renderFlying(dt) {
    this.fragmentRenderer.update(dt);
    this.particleSystem.update(dt);
    
    this.fragmentRenderer.render();
    this.particleSystem.render(this.camera.getVPMatrix());
  }

  /**
   * 渲染消散阶段
   */
  renderFading(dt, elapsed) {
    const lifetime = parseFloat(this.config.tear_fragment_lifetime || 3000);
    const fadeStart = lifetime * 0.85;
    const fadeDuration = lifetime * 0.15;
    const fadeProgress = (elapsed - fadeStart) / fadeDuration;
    
    this.fragmentRenderer.update(dt);
    this.particleSystem.update(dt);
    this.fragmentRenderer.applyFade(fadeProgress);
    
    this.fragmentRenderer.render();
    this.particleSystem.render(this.camera.getVPMatrix());
  }

  /**
   * 更新 FPS
   */
  updateFPS(now) {
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      
      // 触发 FPS 更新事件
      if (window.updateFPS) {
        window.updateFPS(this.fps);
      }
    }
  }

  /**
   * 重置动画
   */
  reset() {
    this.isAnimating = false;
    this.phase = AnimationPhase.IDLE;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.crackRenderer.setCracks([]);
    this.fragmentRenderer.reset();
    this.particleSystem.reset();
    this.camera.reset();
    
    // 清除画布
    const gl = this.gl;
    gl.clearColor(0.1, 0.1, 0.15, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 触发状态更新
    if (window.updateAnimationState) {
      window.updateAnimationState('idle', 0, 0);
    }
    
    console.log('🔄 动画已重置');
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    this.config = config;
    this.camera.updateConfig(config);
    this.crackRenderer.updateConfig(config);
    this.particleSystem.updateConfig(config);
    this.fragmentRenderer.updateConfig(config);
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      phase: this.phase,
      fragmentCount: this.fragmentRenderer.getFragmentCount(),
      particleCount: this.particleSystem.getParticleCount(),
      fps: this.fps
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    this.reset();
    this.shaderManager.dispose();
    this.crackRenderer.dispose();
    this.particleSystem.dispose();
    this.fragmentRenderer.dispose();
  }
}

