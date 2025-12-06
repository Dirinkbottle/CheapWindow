/**
 * 裂纹渲染器
 * 使用 WebGL 渲染真实的裂纹线条
 */

import crackVertShader from '../shaders/crack.vert.js';
import crackFragShader from '../shaders/crack.frag.js';

export class CrackRenderer {
  constructor(gl, shaderManager, config) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.config = config;
    
    // 创建着色器程序
    this.programInfo = shaderManager.createProgram(
      'crack',
      crackVertShader,
      crackFragShader
    );
    
    // 缓冲区
    this.positionBuffer = null;
    this.widthBuffer = null;
    
    // 裂纹数据
    this.cracks = [];
    this.crackLines = [];
  }

  /**
   * 设置裂纹数据
   */
  setCracks(cracks) {
    this.cracks = cracks;
    this.updateBuffers();
  }

  /**
   * 更新缓冲区
   */
  updateBuffers() {
    const gl = this.gl;
    
    // 收集所有线段
    this.crackLines = [];
    this.cracks.forEach(crack => {
      crack.segments.forEach(segment => {
        this.crackLines.push(segment);
      });
    });
    
    if (this.crackLines.length === 0) return;
    
    // 准备顶点数据
    const positions = [];
    const widths = [];
    
    this.crackLines.forEach(segment => {
      // 起点
      positions.push(segment.start.x, segment.start.y);
      widths.push(segment.width);
      
      // 终点
      positions.push(segment.end.x, segment.end.y);
      widths.push(segment.width);
    });
    
    // 创建或更新位置缓冲区
    if (!this.positionBuffer) {
      this.positionBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // 创建或更新宽度缓冲区
    if (!this.widthBuffer) {
      this.widthBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.widthBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(widths), gl.STATIC_DRAW);
  }

  /**
   * 渲染裂纹（带生长动画）
   */
  render(visibleSegments, resolution) {
    if (!this.programInfo || visibleSegments.length === 0) return;
    
    const gl = this.gl;
    const programInfo = this.shaderManager.useProgram('crack');
    
    if (!programInfo) return;
    
    // 启用属性
    const positionLoc = programInfo.attributes['a_position'];
    const widthLoc = programInfo.attributes['a_width'];
    
    if (positionLoc === undefined || widthLoc === undefined) return;
    
    // 设置位置属性
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    
    // 设置宽度属性
    gl.bindBuffer(gl.ARRAY_BUFFER, this.widthBuffer);
    gl.enableVertexAttribArray(widthLoc);
    gl.vertexAttribPointer(widthLoc, 1, gl.FLOAT, false, 0, 0);
    
    // 设置 uniforms
    this.shaderManager.setUniforms(programInfo, {
      u_resolution: [resolution.width, resolution.height],
      u_color: [1.0, 1.0, 1.0, 0.8],
      u_glowIntensity: parseFloat(this.config.tear_crack_glow || 1)
    });
    
    // 启用混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // 设置线宽（注意：WebGL 不支持，所以在着色器中模拟）
    gl.lineWidth(1);
    
    // 渲染每个可见段
    visibleSegments.forEach((item, index) => {
      if (index * 2 >= this.crackLines.length * 2) return;
      
      const progress = item.progress;
      if (progress <= 0) return;
      
      // 根据进度调整透明度
      const opacity = 0.6 + progress * 0.4;
      this.shaderManager.setUniform(programInfo, 'u_color', [1.0, 1.0, 1.0, opacity]);
      
      // 渲染线段
      gl.drawArrays(gl.LINES, index * 2, 2);
    });
    
    // 禁用属性
    gl.disableVertexAttribArray(positionLoc);
    gl.disableVertexAttribArray(widthLoc);
    
    gl.disable(gl.BLEND);
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
    if (this.widthBuffer) {
      gl.deleteBuffer(this.widthBuffer);
      this.widthBuffer = null;
    }
  }
}

