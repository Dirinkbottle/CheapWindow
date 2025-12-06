/**
 * GPU 粒子系统
 * 使用 Point Sprites 渲染高性能粒子
 */

import particleVertShader from '../shaders/particle.vert.js';
import particleFragShader from '../shaders/particle.frag.js';
import { updateParticlePhysics } from '../utils/physics.js';

export class ParticleSystem {
  constructor(gl, shaderManager, config) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.config = config;
    
    // 创建着色器程序
    this.programInfo = shaderManager.createProgram(
      'particle',
      particleVertShader,
      particleFragShader
    );
    
    // 粒子数据
    this.particles = [];
    
    // 缓冲区
    this.positionBuffer = null;
    this.sizeBuffer = null;
    this.colorBuffer = null;
  }

  /**
   * 生成粒子
   */
  generateParticles(center, count, config) {
    this.particles = [];
    
    const glassCount = parseInt(config.tear_particle_glass_count || 20);
    const sparkleCount = parseInt(config.tear_particle_sparkle_count || 15);
    const smokeCount = parseInt(config.tear_particle_smoke_count || 15);
    
    // 玻璃碎片粒子
    for (let i = 0; i < glassCount && this.particles.length < count; i++) {
      this.particles.push(this.createParticle(center, 'glass'));
    }
    
    // 火花粒子
    for (let i = 0; i < sparkleCount && this.particles.length < count; i++) {
      this.particles.push(this.createParticle(center, 'sparkle'));
    }
    
    // 烟雾粒子
    for (let i = 0; i < smokeCount && this.particles.length < count; i++) {
      this.particles.push(this.createParticle(center, 'smoke'));
    }
  }

  /**
   * 创建单个粒子
   */
  createParticle(center, type) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    
    const particle = {
      position: {
        x: center.x,
        y: center.y,
        z: center.z || 0
      },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed - 2,
        z: (Math.random() - 0.5) * speed
      },
      life: 1.0,
      maxLife: 0.5 + Math.random() * 0.5,
      size: 0,
      currentSize: 0,
      opacity: 1.0,
      type,
      color: [1, 1, 1, 1]
    };
    
    // 根据类型设置属性
    switch (type) {
      case 'glass':
        particle.size = 3 + Math.random() * 5;
        particle.color = [0.8 + Math.random() * 0.2, 0.9 + Math.random() * 0.1, 1.0, 1.0];
        particle.maxLife *= 1.2;
        break;
      
      case 'sparkle':
        particle.size = 2 + Math.random() * 3;
        particle.color = [1.0, 0.8 + Math.random() * 0.2, 0.3 + Math.random() * 0.3, 1.0];
        particle.velocity.x *= 1.5;
        particle.velocity.y *= 1.5;
        particle.velocity.z *= 1.5;
        particle.maxLife *= 0.8;
        break;
      
      case 'smoke':
        particle.size = 4 + Math.random() * 6;
        particle.color = [0.7, 0.7, 0.7, 0.6];
        particle.velocity.x *= 0.5;
        particle.velocity.y *= 0.3;
        particle.velocity.z *= 0.5;
        particle.maxLife *= 1.5;
        break;
    }
    
    particle.currentSize = particle.size;
    
    return particle;
  }

  /**
   * 更新粒子
   */
  update(dt) {
    // 更新每个粒子的物理
    this.particles.forEach(particle => {
      updateParticlePhysics(particle, dt, this.config);
    });
    
    // 移除死亡的粒子
    this.particles = this.particles.filter(p => p.life > 0);
    
    // 更新缓冲区
    this.updateBuffers();
  }

  /**
   * 更新缓冲区
   */
  updateBuffers() {
    if (this.particles.length === 0) return;
    
    const gl = this.gl;
    
    // 准备数据
    const positions = [];
    const sizes = [];
    const colors = [];
    
    this.particles.forEach(particle => {
      positions.push(particle.position.x, particle.position.y, particle.position.z);
      sizes.push(particle.currentSize);
      colors.push(
        particle.color[0],
        particle.color[1],
        particle.color[2],
        particle.color[3] * particle.opacity
      );
    });
    
    // 创建或更新缓冲区
    if (!this.positionBuffer) {
      this.positionBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    
    if (!this.sizeBuffer) {
      this.sizeBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
    
    if (!this.colorBuffer) {
      this.colorBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  }

  /**
   * 渲染粒子
   */
  render(mvpMatrix) {
    if (!this.programInfo || this.particles.length === 0) return;
    
    const gl = this.gl;
    const programInfo = this.shaderManager.useProgram('particle');
    
    if (!programInfo) return;
    
    // 启用属性
    const positionLoc = programInfo.attributes['a_position'];
    const sizeLoc = programInfo.attributes['a_size'];
    const colorLoc = programInfo.attributes['a_color'];
    
    if (positionLoc === undefined) return;
    
    // 设置位置
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    
    // 设置大小
    if (sizeLoc !== undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
    }
    
    // 设置颜色
    if (colorLoc !== undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    }
    
    // 设置 uniforms
    this.shaderManager.setUniforms(programInfo, {
      u_mvpMatrix: mvpMatrix,
      u_pointSize: 1.0
    });
    
    // 启用混合和点精灵
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // 加法混合用于发光效果
    
    // 渲染粒子
    gl.drawArrays(gl.POINTS, 0, this.particles.length);
    
    // 清理
    gl.disableVertexAttribArray(positionLoc);
    if (sizeLoc !== undefined) {
      gl.disableVertexAttribArray(sizeLoc);
    }
    if (colorLoc !== undefined) {
      gl.disableVertexAttribArray(colorLoc);
    }
    
    gl.disable(gl.BLEND);
  }

  /**
   * 获取粒子数量
   */
  getParticleCount() {
    return this.particles.length;
  }

  /**
   * 重置
   */
  reset() {
    this.particles = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    this.config = config;
  }

  /**
   * 清理资源
   */
  dispose() {
    const gl = this.gl;
    if (this.positionBuffer) {
      gl.deleteBuffer(this.positionBuffer);
      this.positionBuffer = null;
    }
    if (this.sizeBuffer) {
      gl.deleteBuffer(this.sizeBuffer);
      this.sizeBuffer = null;
    }
    if (this.colorBuffer) {
      gl.deleteBuffer(this.colorBuffer);
      this.colorBuffer = null;
    }
    this.particles = [];
  }
}

