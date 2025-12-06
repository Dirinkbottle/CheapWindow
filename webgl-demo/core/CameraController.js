/**
 * 相机控制器
 * 管理透视投影、视图矩阵和相机动画
 */

import * as Matrix from '../utils/matrix3d.js';

export class CameraController {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    
    // 相机参数
    this.fov = parseFloat(config.tear_camera_fov || 60) * Math.PI / 180;
    this.distance = parseFloat(config.tear_camera_distance || 800);
    this.position = [0, 0, this.distance];
    this.target = [0, 0, 0];
    this.up = [0, 1, 0];
    
    // 相机抖动
    this.shakeEnabled = config.tear_enable_camera_shake === '1';
    this.shakeIntensity = parseFloat(config.tear_camera_shake_intensity || 10);
    this.shakeDuration = parseFloat(config.tear_camera_shake_duration || 500);
    this.shakeTime = 0;
    this.shakeOffset = [0, 0, 0];
    
    // 相机跟踪
    this.trackingEnabled = config.tear_enable_camera_tracking === '1';
    this.trackingSmooth = parseFloat(config.tear_camera_tracking_smooth || 0.1);
    this.trackTarget = null;
    
    // 矩阵缓存
    this.projectionMatrix = null;
    this.viewMatrix = null;
    this.vpMatrix = null;
    
    this.updateMatrices();
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    this.config = config;
    this.fov = parseFloat(config.tear_camera_fov || 60) * Math.PI / 180;
    this.distance = parseFloat(config.tear_camera_distance || 800);
    this.shakeEnabled = config.tear_enable_camera_shake === '1';
    this.shakeIntensity = parseFloat(config.tear_camera_shake_intensity || 10);
    this.shakeDuration = parseFloat(config.tear_camera_shake_duration || 500);
    this.trackingEnabled = config.tear_enable_camera_tracking === '1';
    this.trackingSmooth = parseFloat(config.tear_camera_tracking_smooth || 0.1);
    
    this.updateMatrices();
  }

  /**
   * 更新相机矩阵
   */
  updateMatrices() {
    const aspect = this.canvas.width / this.canvas.height;
    const near = 0.1;
    const far = 2000;
    
    // 透视投影矩阵
    this.projectionMatrix = Matrix.perspective(this.fov, aspect, near, far);
    
    // 应用抖动偏移
    const camPos = [
      this.position[0] + this.shakeOffset[0],
      this.position[1] + this.shakeOffset[1],
      this.position[2] + this.shakeOffset[2]
    ];
    
    // 视图矩阵
    this.viewMatrix = Matrix.lookAt(camPos, this.target, this.up);
    
    // VP 矩阵（投影 * 视图）
    this.vpMatrix = Matrix.multiply(this.projectionMatrix, this.viewMatrix);
  }

  /**
   * 触发相机抖动
   */
  triggerShake() {
    if (this.shakeEnabled) {
      this.shakeTime = 0;
    }
  }

  /**
   * 更新相机抖动
   */
  updateShake(dt) {
    if (!this.shakeEnabled || this.shakeTime >= this.shakeDuration) {
      this.shakeOffset = [0, 0, 0];
      return;
    }
    
    this.shakeTime += dt * 1000;
    
    // 衰减因子
    const decay = 1 - (this.shakeTime / this.shakeDuration);
    const intensity = this.shakeIntensity * decay;
    
    // 随机抖动
    this.shakeOffset = [
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity,
      (Math.random() - 0.5) * intensity * 0.5
    ];
    
    this.updateMatrices();
  }

  /**
   * 设置跟踪目标
   */
  setTrackTarget(target) {
    this.trackTarget = target;
  }

  /**
   * 更新相机跟踪
   */
  updateTracking(dt) {
    if (!this.trackingEnabled || !this.trackTarget) {
      return;
    }
    
    // 平滑跟踪目标
    const smooth = this.trackingSmooth;
    this.target[0] += (this.trackTarget[0] - this.target[0]) * smooth;
    this.target[1] += (this.trackTarget[1] - this.target[1]) * smooth;
    this.target[2] += (this.trackTarget[2] - this.target[2]) * smooth;
    
    this.updateMatrices();
  }

  /**
   * 更新相机
   */
  update(dt) {
    this.updateShake(dt);
    this.updateTracking(dt);
  }

  /**
   * 获取 MVP 矩阵
   */
  getMVPMatrix(modelMatrix) {
    return Matrix.multiply(this.vpMatrix, modelMatrix);
  }

  /**
   * 获取投影矩阵
   */
  getProjectionMatrix() {
    return this.projectionMatrix;
  }

  /**
   * 获取视图矩阵
   */
  getViewMatrix() {
    return this.viewMatrix;
  }

  /**
   * 获取 VP 矩阵
   */
  getVPMatrix() {
    return this.vpMatrix;
  }

  /**
   * 获取相机位置
   */
  getPosition() {
    return [
      this.position[0] + this.shakeOffset[0],
      this.position[1] + this.shakeOffset[1],
      this.position[2] + this.shakeOffset[2]
    ];
  }

  /**
   * 设置相机位置
   */
  setPosition(x, y, z) {
    this.position = [x, y, z];
    this.updateMatrices();
  }

  /**
   * 设置目标位置
   */
  setTarget(x, y, z) {
    this.target = [x, y, z];
    this.updateMatrices();
  }

  /**
   * 重置相机
   */
  reset() {
    this.position = [0, 0, this.distance];
    this.target = [0, 0, 0];
    this.shakeTime = this.shakeDuration;
    this.shakeOffset = [0, 0, 0];
    this.trackTarget = null;
    this.updateMatrices();
  }
}

