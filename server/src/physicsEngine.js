/**
 * 服务器端物理引擎
 * 使用百分比坐标系统（0-100%），解决跨设备屏幕尺寸差异
 */

export class PhysicsEngine {
  constructor() {
    this.windows = new Map(); // windowId -> windowState
    this.isRunning = false;
    this.intervalId = null;
    this.fps = 60;
    this.deltaTime = 1000 / this.fps; // 毫秒
  }

  /**
   * 启动物理引擎
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`✓ 物理引擎已启动 (${this.fps} FPS)`);
    
    this.intervalId = setInterval(() => {
      this.update();
    }, this.deltaTime);
  }

  /**
   * 停止物理引擎
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('✓ 物理引擎已停止');
  }

  /**
   * 添加窗口到物理系统
   */
  addWindow(windowData) {
    const physicsState = {
      id: windowData.id,
      position: { ...windowData.position }, // 百分比坐标
      velocity: { x: 0, y: 0 }, // 速度 (%/秒)
      grabbedBy: [], // 当前抓取的用户ID列表
      isContested: false, // 是否被多人抢夺
      contestStartTime: null, // 抢夺开始时间
      isDragging: false,
      lastUpdateTime: Date.now(),
      
      // 窗口基本信息
      message: windowData.message,
      size: windowData.size,
      colors: windowData.colors,
      fontSize: windowData.fontSize,
      floatAnimation: windowData.floatAnimation
    };
    
    this.windows.set(windowData.id, physicsState);
    return physicsState;
  }

  /**
   * 移除窗口
   */
  removeWindow(windowId) {
    this.windows.delete(windowId);
  }

  /**
   * 获取所有窗口状态
   */
  getAllWindows() {
    return Array.from(this.windows.values());
  }

  /**
   * 用户抓取窗口
   */
  grabWindow(windowId, userId) {
    const window = this.windows.get(windowId);
    if (!window) return null;

    // 添加用户到抓取列表
    if (!window.grabbedBy.includes(userId)) {
      window.grabbedBy.push(userId);
    }

    // 停止窗口的速度
    window.velocity = { x: 0, y: 0 };
    window.isDragging = true;

    // 检查是否进入抢夺状态
    if (window.grabbedBy.length > 1) {
      if (!window.isContested) {
        window.isContested = true;
        window.contestStartTime = Date.now();
      }
    }

    return window;
  }

  /**
   * 用户拖动窗口
   */
  dragWindow(windowId, position) {
    const window = this.windows.get(windowId);
    if (!window || !window.isDragging) return null;

    // 更新位置
    const lastPosition = { ...window.position };
    window.position = { ...position };
    
    // 确保在边界内
    window.position.x = Math.max(0, Math.min(100, window.position.x));
    window.position.y = Math.max(0, Math.min(100, window.position.y));

    // 计算速度（用于后续的抛投）
    const now = Date.now();
    const dt = (now - window.lastUpdateTime) / 1000; // 转换为秒
    if (dt > 0) {
      window.velocity.x = (window.position.x - lastPosition.x) / dt;
      window.velocity.y = (window.position.y - lastPosition.y) / dt;
    }
    
    window.lastUpdateTime = now;
    return window;
  }

  /**
   * 用户释放窗口
   */
  releaseWindow(windowId, userId, velocity = null) {
    const window = this.windows.get(windowId);
    if (!window) return null;

    // 从抓取列表中移除用户
    window.grabbedBy = window.grabbedBy.filter(id => id !== userId);

    // 如果没有用户抓取，则恢复正常状态
    if (window.grabbedBy.length === 0) {
      window.isDragging = false;
      window.isContested = false;
      window.contestStartTime = null;
      
      // 如果提供了速度，应用抛投效果
      if (velocity) {
        window.velocity = { ...velocity };
      }
    } else if (window.grabbedBy.length === 1) {
      // 只剩一个用户，退出抢夺状态
      window.isContested = false;
      window.contestStartTime = null;
    }

    return window;
  }

  /**
   * 物理更新循环
   */
  update() {
    const now = Date.now();
    const dt = this.deltaTime / 1000; // 转换为秒
    const updates = [];
    const tornWindows = [];

    for (const window of this.windows.values()) {
      let hasUpdate = false;

      // 1. 检查抢夺状态
      if (window.isContested && window.grabbedBy.length > 1) {
        const contestDuration = now - window.contestStartTime;
        // 撕裂时间计算：基础5秒 / (抢夺人数 - 1)
        const tearDuration = 5000 / (window.grabbedBy.length - 1);
        
        if (contestDuration >= tearDuration) {
          // 窗口撕裂！
          tornWindows.push(window.id);
          continue;
        }
      }

      // 2. 如果正在被拖动，跳过物理模拟
      if (window.isDragging) {
        continue;
      }

      // 3. 更新位置（应用速度）
      if (Math.abs(window.velocity.x) > 0.01 || Math.abs(window.velocity.y) > 0.01) {
        window.position.x += window.velocity.x * dt;
        window.position.y += window.velocity.y * dt;
        hasUpdate = true;

        // 4. 边界碰撞检测和反弹
        const bounceCoefficient = 0.7; // 弹性系数
        
        if (window.position.x <= 0) {
          window.position.x = 0;
          window.velocity.x = Math.abs(window.velocity.x) * bounceCoefficient;
          hasUpdate = true;
        } else if (window.position.x >= 100) {
          window.position.x = 100;
          window.velocity.x = -Math.abs(window.velocity.x) * bounceCoefficient;
          hasUpdate = true;
        }

        if (window.position.y <= 0) {
          window.position.y = 0;
          window.velocity.y = Math.abs(window.velocity.y) * bounceCoefficient;
          hasUpdate = true;
        } else if (window.position.y >= 100) {
          window.position.y = 100;
          window.velocity.y = -Math.abs(window.velocity.y) * bounceCoefficient;
          hasUpdate = true;
        }

        // 5. 应用摩擦力
        const friction = 0.98;
        window.velocity.x *= friction;
        window.velocity.y *= friction;

        // 6. 速度太小时停止
        if (Math.abs(window.velocity.x) < 0.01) window.velocity.x = 0;
        if (Math.abs(window.velocity.y) < 0.01) window.velocity.y = 0;
      }

      // 收集有更新的窗口
      if (hasUpdate) {
        updates.push({
          id: window.id,
          position: window.position,
          velocity: window.velocity
        });
      }
    }

    // 返回更新数据和撕裂的窗口
    return {
      updates,
      tornWindows
    };
  }

  /**
   * 获取抢夺状态数据
   */
  getContestedData(windowId) {
    const window = this.windows.get(windowId);
    if (!window || !window.isContested) return null;

    const contestDuration = Date.now() - window.contestStartTime;
    const tearDuration = 5000 / (window.grabbedBy.length - 1);
    const timeLeft = Math.max(0, tearDuration - contestDuration);
    const shakeIntensity = window.grabbedBy.length * 2;

    return {
      windowId: window.id,
      userCount: window.grabbedBy.length,
      timeLeft: Math.round(timeLeft),
      shakeIntensity,
      progress: contestDuration / tearDuration
    };
  }

  /**
   * 清空所有窗口
   */
  clear() {
    this.windows.clear();
    console.log('✓ 物理引擎已清空所有窗口');
  }

  /**
   * 获取窗口数量
   */
  getWindowCount() {
    return this.windows.size;
  }
}

