/**
 * 碎片渲染器
 * 渲染 3D Voronoi 碎片，带 Phong 光照
 */

import fragmentVertShader from '../shaders/fragment.vert.js';
import fragmentFragShader from '../shaders/fragment.frag.js';
import * as Matrix from '../utils/matrix3d.js';
import { updateFragmentPhysics } from '../utils/physics.js';

export class FragmentRenderer {
  constructor(gl, shaderManager, camera, config) {
    this.gl = gl;
    this.shaderManager = shaderManager;
    this.camera = camera;
    this.config = config;
    
    // 创建着色器程序
    this.programInfo = shaderManager.createProgram(
      'fragment',
      fragmentVertShader,
      fragmentFragShader
    );
    
    // 碎片数据
    this.fragments = [];
    
    // 纹理
    this.texture = null;
    
    // 创建默认纹理
    this.createDefaultTexture();
  }

  /**
   * 创建默认纹理（渐变色）
   */
  createDefaultTexture() {
    const gl = this.gl;
    const width = 256;
    const height = 256;
    
    // 创建渐变纹理数据
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const t = x / width;
        pixels[index + 0] = Math.floor(76 + t * (33 - 76));      // R
        pixels[index + 1] = Math.floor(175 + t * (150 - 175));   // G
        pixels[index + 2] = Math.floor(80 + t * (243 - 80));     // B
        pixels[index + 3] = 255;                                  // A
      }
    }
    
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * 从 Voronoi 单元格生成 3D 碎片
   */
  generateFragments(cells, bounds, center) {
    this.fragments = [];
    
    const initialSpeedMult = parseFloat(this.config.tear_initial_speed_mult || 1);
    
    cells.forEach((cell, index) => {
      const fragment = {
        id: index,
        cell,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        opacity: 1.0,
        size: 0
      };
      
      // 计算碎片大小
      fragment.size = Math.sqrt(cell.polygon.length) * 10;
      
      // 计算初始速度（从中心向外）
      const dx = cell.site.x - center.x;
      const dy = cell.site.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const force = cell.force || 1;
      
      fragment.velocity.x = (dx / dist) * 3 * force * initialSpeedMult;
      fragment.velocity.y = (dy / dist) * 3 * force * initialSpeedMult;
      fragment.velocity.z = (Math.random() - 0.5) * 2 * initialSpeedMult;
      
      // 初始旋转速度
      fragment.angularVelocity.x = (Math.random() - 0.5) * 0.1;
      fragment.angularVelocity.y = (Math.random() - 0.5) * 0.1;
      fragment.angularVelocity.z = (Math.random() - 0.5) * 0.1;
      
      // 创建几何体
      fragment.geometry = this.createFragmentGeometry(cell, bounds);
      
      this.fragments.push(fragment);
    });
  }

  /**
   * 为碎片创建 3D 几何体
   */
  createFragmentGeometry(cell, bounds) {
    const gl = this.gl;
    const polygon = cell.polygon;
    
    if (polygon.length < 3) return null;
    
    // 三角化多边形（简单扇形三角化）
    const vertices = [];
    const normals = [];
    const texCoords = [];
    const indices = [];
    
    const thickness = parseFloat(this.config.tear_fragment_thickness || 1);
    const centerX = cell.site.x - bounds.width / 2;
    const centerY = cell.site.y - bounds.height / 2;
    
    // 前面
    polygon.forEach((point, i) => {
      const x = point.x - bounds.width / 2;
      const y = point.y - bounds.height / 2;
      const z = thickness;
      
      vertices.push(x, y, z);
      normals.push(0, 0, 1);
      texCoords.push(point.x / bounds.width, point.y / bounds.height);
      
      if (i >= 2) {
        indices.push(0, i - 1, i);
      }
    });
    
    // 创建缓冲区
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    
    return {
      positionBuffer,
      normalBuffer,
      texCoordBuffer,
      indexBuffer,
      indexCount: indices.length,
      vertexCount: vertices.length / 3
    };
  }

  /**
   * 更新碎片物理
   */
  update(dt) {
    this.fragments.forEach(fragment => {
      updateFragmentPhysics(fragment, dt, this.config);
    });
  }

  /**
   * 渲染所有碎片
   */
  render() {
    if (!this.programInfo || this.fragments.length === 0) return;
    
    const gl = this.gl;
    const programInfo = this.shaderManager.useProgram('fragment');
    
    if (!programInfo) return;
    
    // 启用深度测试和混合
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // 设置光照参数
    const lightDir = [
      parseFloat(this.config.tear_light_dir_x || 0.5),
      parseFloat(this.config.tear_light_dir_y || -0.5),
      parseFloat(this.config.tear_light_dir_z || 0.8)
    ];
    const length = Math.sqrt(lightDir[0] ** 2 + lightDir[1] ** 2 + lightDir[2] ** 2);
    lightDir[0] /= length;
    lightDir[1] /= length;
    lightDir[2] /= length;
    
    // 渲染每个碎片
    this.fragments.forEach(fragment => {
      if (!fragment.geometry) return;
      
      this.renderFragment(fragment, programInfo, lightDir);
    });
    
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  /**
   * 渲染单个碎片
   */
  renderFragment(fragment, programInfo, lightDir) {
    const gl = this.gl;
    const geom = fragment.geometry;
    
    // 创建模型矩阵
    const modelMatrix = Matrix.createFragmentModelMatrix(
      [fragment.position.x, fragment.position.y, fragment.position.z],
      [fragment.rotation.x, fragment.rotation.y, fragment.rotation.z],
      [fragment.scale.x, fragment.scale.y, fragment.scale.z]
    );
    
    // MVP 矩阵
    const mvpMatrix = this.camera.getMVPMatrix(modelMatrix);
    
    // 法线矩阵（模型矩阵的逆转置）
    const normalMatrix = Matrix.inverse(modelMatrix);
    if (!normalMatrix) return;
    
    // 设置属性
    const positionLoc = programInfo.attributes['a_position'];
    const normalLoc = programInfo.attributes['a_normal'];
    const texCoordLoc = programInfo.attributes['a_texCoord'];
    
    if (positionLoc !== undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, geom.positionBuffer);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    }
    
    if (normalLoc !== undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, geom.normalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }
    
    if (texCoordLoc !== undefined) {
      gl.bindBuffer(gl.ARRAY_BUFFER, geom.texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    
    // 设置 uniforms
    this.shaderManager.setUniforms(programInfo, {
      u_mvpMatrix: mvpMatrix,
      u_modelMatrix: modelMatrix,
      u_normalMatrix: normalMatrix,
      u_texture: 0,
      u_lightDir: lightDir,
      u_viewPos: this.camera.getPosition(),
      u_ambientLight: parseFloat(this.config.tear_ambient_light || 0.3),
      u_directionalLight: parseFloat(this.config.tear_directional_light || 0.7),
      u_edgeLightIntensity: parseFloat(this.config.tear_edge_light_intensity || 0.5),
      u_opacity: fragment.opacity,
      u_lightColor: [1.0, 1.0, 1.0]
    });
    
    // 绘制
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geom.indexBuffer);
    gl.drawElements(gl.TRIANGLES, geom.indexCount, gl.UNSIGNED_SHORT, 0);
    
    // 清理
    if (positionLoc !== undefined) gl.disableVertexAttribArray(positionLoc);
    if (normalLoc !== undefined) gl.disableVertexAttribArray(normalLoc);
    if (texCoordLoc !== undefined) gl.disableVertexAttribArray(texCoordLoc);
  }

  /**
   * 获取碎片数量
   */
  getFragmentCount() {
    return this.fragments.length;
  }

  /**
   * 应用淡出效果
   */
  applyFade(fadeProgress) {
    this.fragments.forEach(fragment => {
      fragment.opacity = 1 - fadeProgress;
    });
  }

  /**
   * 重置
   */
  reset() {
    this.fragments.forEach(fragment => {
      if (fragment.geometry) {
        const gl = this.gl;
        gl.deleteBuffer(fragment.geometry.positionBuffer);
        gl.deleteBuffer(fragment.geometry.normalBuffer);
        gl.deleteBuffer(fragment.geometry.texCoordBuffer);
        gl.deleteBuffer(fragment.geometry.indexBuffer);
      }
    });
    this.fragments = [];
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
    this.reset();
    const gl = this.gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}

