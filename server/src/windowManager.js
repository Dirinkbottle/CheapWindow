/**
 * 窗口管理器
 * 负责窗口生成、位置分配、与物理引擎协同
 */
import { v4 as uuidv4 } from 'uuid';
import { Message, Setting } from './models/Message.js';
import { PhysicsEngine } from './physicsEngine.js';

export class WindowManager {
  constructor(io, onlineUsers, wallManager = null) {
    this.io = io; // Socket.IO实例
    this.onlineUsers = onlineUsers; // 在线用户 Map
    this.wallManager = wallManager; // 墙壁管理器（可选）
    this.physicsEngine = new PhysicsEngine();
    this.config = null;
    this.generatorIntervalId = null;
    this.physicsIntervalId = null;
    this.wallLockCleanupIntervalId = null;
    this.gridPositions = [];
    this.currentGridIndex = 0;
    
    // 记录本帧已被墙壁捕获的边缘，防止多个窗口同时捕获到同一墙壁
    this.wallCapturedThisFrame = { top: false, right: false, bottom: false, left: false };
    
    // ✅ 墙壁动画锁（防止动画播放期间新窗口被捕获）
    // { edge: { windowId, startTime, duration } or null }
    this.wallAnimationLocks = { top: null, right: null, bottom: null, left: null };
    
    // 💡 待确认的捕获事件 (captureId -> {windowData, timestamp, timeoutId})
    this.pendingCaptures = new Map();
    
    // ✅ 异步碰撞处理队列（避免阻塞物理循环）
    this.collisionQueue = [];
    this.isProcessingCollisions = false;
    
    // ✅ 全局捕获防护集合（防止重复捕获）
    this.capturedWindowsSet = new Set();
    
    // ✅ 捕获统计
    this.captureStats = {
      success: 0,      // 成功捕获
      rejected: 0,     // 拒绝捕获（重复、锁定等）
      timeout: 0,      // 超时回滚
      confirmed: 0     // 确认完成
    };
  }

  /**
   * 获取当前有效的最大窗口数（考虑移动端比例）
   */
  getEffectiveMaxWindows() {
    if (!this.config.auto_detect_device || this.config.auto_detect_device === '0') {
      return this.config.max_windows;
    }

    // 计算移动端用户比例
    let mobileCount = 0;
    for (const userData of this.onlineUsers.values()) {
      if (userData.isMobile) mobileCount++;
    }
    
    const mobileRatio = this.onlineUsers.size > 0 ? mobileCount / this.onlineUsers.size : 0;
    
    // 如果移动端用户超过 50%，使用移动端配置
    if (mobileRatio > 0.5) {
      const maxWindowsMobile = this.config.max_windows_mobile || this.config.max_windows;
      console.log(`📱 [移动端模式] 检测到 ${(mobileRatio * 100).toFixed(0)}% 移动端用户，使用移动端窗口限制: ${maxWindowsMobile}`);
      return maxWindowsMobile;
    }
    
    return this.config.max_windows;
  }

  /**
   * 加载配置
   */
  async loadConfig() {
    this.config = await Setting.getAll();
    
    // 转换数值类型
    this.config.max_windows = parseInt(this.config.max_windows) || 20;
    this.config.interval = parseFloat(this.config.interval) || 0.3;
    this.config.batch_count = parseInt(this.config.batch_count) || 3;
    this.config.window_width = parseInt(this.config.window_width) || 200;
    this.config.window_height = parseInt(this.config.window_height) || 80;
    this.config.size_random = parseInt(this.config.size_random) || 30;
    this.config.position_offset = parseInt(this.config.position_offset) || 50;
    this.config.font_size = parseInt(this.config.font_size) || 14;
    this.config.font_random = parseInt(this.config.font_random) || 4;
    this.config.float_range = parseInt(this.config.float_range) || 5;
    
    // 高级配置
    this.config.generation_mode = this.config.generation_mode || 'auto';
    this.config.min_window_lifetime = parseInt(this.config.min_window_lifetime) || 10;
    this.config.max_window_lifetime = parseInt(this.config.max_window_lifetime) || 60;
    this.config.enable_auto_cleanup = this.config.enable_auto_cleanup === '1';
    this.config.tear_base_duration = parseInt(this.config.tear_base_duration) || 5000;
    this.config.shake_intensity_multiplier = parseFloat(this.config.shake_intensity_multiplier) || 2;
    
    // 性能优化配置
    this.config.physics_fps = parseInt(this.config.physics_fps) || 60;
    this.config.physics_fps_mobile = parseInt(this.config.physics_fps_mobile) || 30;
    this.config.max_windows_mobile = parseInt(this.config.max_windows_mobile) || 10;
    this.config.broadcast_throttle = this.config.broadcast_throttle === '1';
    this.config.auto_detect_device = this.config.auto_detect_device === '1';
    
    console.log('✓ 配置已加载:', this.config);
    return this.config;
  }

  /**
   * 初始化网格位置（百分比坐标系）
   */
  initGridPositions() {
    this.gridPositions = [];
    
    // 假设标准屏幕，计算网格
    // 使用百分比，每个格子占据一定比例
    const cols = Math.floor(100 / 15); // 约6-7列
    const rows = Math.floor(100 / 10); // 约10行
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col * 15) + 5; // 5-95%范围
        const y = (row * 10) + 5; // 5-95%范围
        this.gridPositions.push({ x, y });
      }
    }
    
    // 打乱顺序
    this.shuffleArray(this.gridPositions);
    this.currentGridIndex = 0;
    
    console.log(`✓ 网格位置已初始化: ${this.gridPositions.length} 个位置`);
  }

  /**
   * 获取下一个窗口位置（百分比坐标）
   */
  getNextPosition() {
    if (this.gridPositions.length === 0) {
      this.initGridPositions();
    }

    // 80%使用网格位置，20%完全随机
    let x, y;
    
    if (Math.random() < 0.8) {
      const basePosition = this.gridPositions[this.currentGridIndex % this.gridPositions.length];
      this.currentGridIndex++;
      
      // 添加随机偏移（百分比）
      const offsetRange = 5; // ±5%
      x = basePosition.x + (Math.random() - 0.5) * offsetRange * 2;
      y = basePosition.y + (Math.random() - 0.5) * offsetRange * 2;
    } else {
      // 完全随机
      x = Math.random() * 90 + 5; // 5-95%
      y = Math.random() * 90 + 5;
    }

    // 确保在边界内
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    return { x, y };
  }

  /**
   * 生成新窗口
   */
  async generateWindow() {
    try {
      // 检查是否达到最大窗口数（考虑移动端限制）
      const maxWindows = this.getEffectiveMaxWindows();
      if (this.physicsEngine.getWindowCount() >= maxWindows) {
        return null;
      }

      // 从数据库获取随机话语
      const message = await Message.getRandom();
      if (!message) {
        console.error('没有可用的励志话语');
        return null;
      }

      // 生成窗口数据
      const windowData = {
        id: uuidv4(),
        message: message.content,
        position: this.getNextPosition(),
        size: {
          width: this.config.window_width + (Math.random() - 0.5) * this.config.size_random,
          height: this.config.window_height + (Math.random() - 0.5) * this.config.size_random
        },
        colors: {
          bg: message.bg_color,
          text: message.text_color
        },
        fontSize: this.config.font_size + (Math.random() - 0.5) * this.config.font_random,
        floatAnimation: {
          offsetX: (Math.random() - 0.5) * this.config.float_range * 2,
          offsetY: (Math.random() - 0.5) * this.config.float_range * 2,
          duration: 3 + Math.random() * 2 // 3-5秒
        },
        timestamp: Date.now(),
        tearBaseDuration: this.config.tear_base_duration,
        shakeIntensityMultiplier: this.config.shake_intensity_multiplier
      };

      // 添加到物理引擎
      const physicsState = this.physicsEngine.addWindow(windowData);

      // 广播给所有客户端
      this.io.emit('window_created', physicsState);

      console.log(`[窗口生成] ID: ${windowData.id.slice(0, 8)}, 话语: ${windowData.message}`);
      return physicsState;

    } catch (error) {
      console.error('生成窗口失败:', error);
      return null;
    }
  }

  /**
   * 批量生成窗口
   */
  async generateBatch() {
    const maxWindows = this.getEffectiveMaxWindows();
    const count = Math.min(
      this.config.batch_count,
      maxWindows - this.physicsEngine.getWindowCount()
    );

    for (let i = 0; i < count; i++) {
      await this.generateWindow();
    }
  }

  /**
   * 启动窗口生成器
   */
  async startGenerator() {
    if (this.generatorIntervalId) return;

    await this.loadConfig();
    this.initGridPositions();
    
    // 根据移动端用户比例设置物理引擎帧率
    const mobileRatio = this.getMobileUserRatio();
    const fps = mobileRatio > 0.5 ? this.config.physics_fps_mobile : this.config.physics_fps;
    this.physicsEngine.setFPS(fps);
    
    console.log(`✓ 窗口生成器已启动 (间隔: ${this.config.interval}秒, 批量: ${this.config.batch_count}, 物理帧率: ${fps}FPS)`);

    // 立即生成第一批
    await this.generateBatch();

    // 定时生成
    this.generatorIntervalId = setInterval(async () => {
      const maxWindows = this.getEffectiveMaxWindows();
      if (this.physicsEngine.getWindowCount() < maxWindows) {
        await this.generateBatch();
      }
    }, this.config.interval * 1000);

    // 启动物理引擎
    this.physicsEngine.start();

    // 启动物理更新广播
    this.startPhysicsBroadcast();
  }

  /**
   * 获取移动端用户比例
   */
  getMobileUserRatio() {
    if (this.onlineUsers.size === 0) return 0;
    
    let mobileCount = 0;
    for (const userData of this.onlineUsers.values()) {
      if (userData.isMobile) mobileCount++;
    }
    
    return mobileCount / this.onlineUsers.size;
  }

  /**
   * 停止窗口生成器
   */
  stopGenerator() {
    if (this.generatorIntervalId) {
      clearInterval(this.generatorIntervalId);
      this.generatorIntervalId = null;
      console.log('✓ 窗口生成器已停止');
    }

    if (this.physicsIntervalId) {
      clearInterval(this.physicsIntervalId);
      this.physicsIntervalId = null;
    }

    // ✅ 清理墙壁锁自动清理定时器
    if (this.wallLockCleanupIntervalId) {
      clearInterval(this.wallLockCleanupIntervalId);
      this.wallLockCleanupIntervalId = null;
      console.log('✓ 墙壁锁清理任务已停止');
    }

    this.physicsEngine.stop();
    this.physicsEngine.clear();
  }

  /**
   * 启动物理状态广播
   */
  startPhysicsBroadcast() {
    if (this.physicsIntervalId) return;

    // ✅ 启动墙壁锁自动清理定时器
    const cleanupInterval = parseInt(this.config?.wall_lock_auto_cleanup_interval || '1000');
    this.wallLockCleanupIntervalId = setInterval(() => {
      this.cleanupExpiredLocks();
    }, cleanupInterval);
    console.log(`✅ [墙壁锁清理] 自动清理任务已启动 (间隔: ${cleanupInterval}ms)`);

    this.physicsIntervalId = setInterval(async () => {
      // 重置本帧墙壁捕获标记
      this.wallCapturedThisFrame = { top: false, right: false, bottom: false, left: false };
      
      const { updates, tornWindows, collisions } = this.physicsEngine.update();

      // 广播物理更新
      if (updates.length > 0) {
        this.io.emit('physics_update', updates);
      }

      // ✅ 将碰撞添加到队列，异步处理（避免阻塞物理循环）
      if (this.wallManager && this.config.enable_wall_system === '1' && collisions.length > 0) {
        this.collisionQueue.push(...collisions);
        this.scheduleCollisionProcessing();
      }

      // 旧的同步处理代码保留但不执行（注释掉）
      /*
      if (this.wallManager && this.config.enable_wall_system === '1' && collisions.length > 0) {
        for (const collision of collisions) {
          // ✅ 步骤0.1: 检查窗口是否已被捕获（全局防护）
          if (this.capturedWindowsSet.has(collision.windowId)) {
            if (this.config.enable_debug_logs === '1') {
              console.log(`⚠️ [重复捕获拒绝] 窗口 ${collision.windowId.slice(0, 8)} 已在捕获流程中，拒绝重复捕获`);
            }
            this.captureStats.rejected++;
            continue; // 跳过，防止重复捕获
          }
          
          // ✅ 步骤0.2: 检查墙壁动画锁（优先级最高）
          const lock = this.wallAnimationLocks[collision.edge];
          if (lock) {
            const elapsed = Date.now() - lock.startTime;
            if (elapsed < lock.duration) {
              // 锁仍然有效，拒绝捕获
              if (this.config.enable_debug_logs === '1') {
                console.log(`🔒 [墙壁锁定] ${collision.edge} 正在播放动画，拒绝捕获 (剩余: ${Math.ceil((lock.duration - elapsed) / 1000)}秒)`);
              }
              this.captureStats.rejected++;
              continue; // 跳过这个碰撞，窗口正常反弹
            } else {
              // 锁已过期，清除
              this.wallAnimationLocks[collision.edge] = null;
              if (this.config.enable_debug_logs === '1') {
                console.log(`🔓 [锁已过期] ${collision.edge} 动画锁已自动清除`);
              }
            }
          }
          
          // ✅ 步骤0.3: 检查该墙壁是否已在本帧被捕获
          if (this.wallCapturedThisFrame[collision.edge]) {
            if (this.config.enable_debug_logs === '1') {
              console.log(`⚠️ [本帧已捕获] ${collision.edge} 墙本帧已捕获其他窗口`);
            }
            this.captureStats.rejected++;
            continue; // 跳过，让窗口正常反弹
          }
          
          // 检查是否有墙壁主人
          const wallOwner = this.wallManager.getWallByEdge(collision.edge);
          if (wallOwner) {
            // ✅ 步骤1: 验证墙壁主人是否真实在线
            if (!this.onlineUsers.has(wallOwner.userId)) {
              console.warn(`⚠️ [墙壁验证失败] 墙壁主人 ${wallOwner.userId.slice(0, 8)} 已离线，释放 ${collision.edge} 墙`);
              this.wallManager.releaseWall(wallOwner.userId);
              // 广播墙壁状态更新
              this.io.emit('wall_state_updated', this.wallManager.getAllWalls());
              continue; // 窗口正常反弹
            }
            
            // ✅ 步骤2: 验证 Socket 连接是否正常
            const socket = this.io.sockets.sockets.get(wallOwner.socketId);
            if (!socket || !socket.connected) {
              console.warn(`⚠️ [墙壁验证失败] Socket ${wallOwner.socketId.slice(0, 8)} 已断开，释放 ${collision.edge} 墙`);
              this.wallManager.releaseWall(wallOwner.userId);
              // 广播墙壁状态更新
              this.io.emit('wall_state_updated', this.wallManager.getAllWalls());
              continue; // 窗口正常反弹
            }
            
            // 获取完整的窗口数据
            const window = this.physicsEngine.windows.get(collision.windowId);
            if (window) {
              // ✅ 立即添加到全局防护集合（最高优先级）
              this.capturedWindowsSet.add(collision.windowId);
              
              // 标记该墙壁本帧已捕获
              this.wallCapturedThisFrame[collision.edge] = true;
              
              // ✅ 步骤3: 生成唯一捕获ID
              const captureId = `${collision.windowId}_${Date.now()}`;
              
              // ✅ 步骤4: 保存窗口数据以备回滚
              const windowData = {
                id: window.id,
                message: window.message,
                position: collision.position, // 使用碰撞前的真实位置
                size: window.size,
                colors: window.colors,
                fontSize: window.fontSize,
                floatAnimation: window.floatAnimation,
                timestamp: Date.now(),
                tearBaseDuration: window.tearBaseDuration,
                shakeIntensityMultiplier: window.shakeIntensityMultiplier
              };
              
              // 移除窗口（先从物理引擎移除）
              this.physicsEngine.removeWindow(collision.windowId);
              
              // 更新统计
              this.captureStats.success++;
              
              // ✅ 步骤5: 发送捕获事件并设置超时回滚
              console.log(`🎯 [墙壁捕获] 窗口 ${collision.windowId.slice(0, 8)} 被 ${collision.edge} 墙捕获 (主人: ${wallOwner.userId.slice(0, 8)})`);
              console.log(`   📌 捕获ID: ${captureId}`);
              console.log(`   📌 碰撞位置: (${collision.position.x.toFixed(1)}%, ${collision.position.y.toFixed(1)}%)`);
              
              // 通知墙壁主人（窗口被捕获）
              socket.emit('window_captured', {
                captureId,
                windowId: collision.windowId,
                window: windowData,
                edge: collision.edge
              });
              
              // 通知其他人（窗口消失）
              this.io.except(wallOwner.socketId).emit('window_removed', {
                windowId: collision.windowId
              });
              
              // ✅ 步骤6: 设置超时，未确认则回滚（超时时间可配置）
              const confirmTimeout = parseInt(this.config.wall_capture_confirm_timeout || '2000');
              const timeoutId = setTimeout(() => {
                if (this.pendingCaptures.has(captureId)) {
                  console.warn(`⚠️ [捕获超时] 捕获 ${captureId} 未在${confirmTimeout}ms内确认，回滚窗口到物理引擎`);
                  this.pendingCaptures.delete(captureId);
                  
                  // ✅ 从防护集合中移除（允许再次捕获）
                  this.capturedWindowsSet.delete(collision.windowId);
                  
                  // 重新添加窗口到物理引擎
                  this.physicsEngine.addWindow(windowData);
                  console.log(`   🔄 [窗口回滚] 窗口 ${collision.windowId.slice(0, 8)} 已恢复，解除捕获锁定`);
                  
                  // 更新统计
                  this.captureStats.timeout++;
                }
              }, confirmTimeout);
              
              // 记录待确认的捕获
              this.pendingCaptures.set(captureId, {
                windowData,
                timestamp: Date.now(),
                timeoutId
              });
              
              // ✅ 步骤7: 设置墙壁动画锁（防止动画播放期间新窗口被捕获）
              const moveSpeed = parseInt(this.config.wall_capture_move_speed || '500');
              const captureDuration = parseInt(this.config.wall_capture_duration || '3000');
              const animationDuration = moveSpeed + captureDuration + 1000; // 总时长 + 1秒缓冲
              
              this.wallAnimationLocks[collision.edge] = {
                windowId: collision.windowId,
                startTime: Date.now(),
                duration: animationDuration
              };
              
              console.log(`🔒 [设置锁] ${collision.edge} 墙已锁定 ${animationDuration}ms (动画播放中)`);
            }
          }
        }
      }
      */

      // 处理撕裂的窗口
      for (const windowId of tornWindows) {
        const window = this.physicsEngine.windows.get(windowId);
        const userVectors = window ? Array.from(window.dragVectors.entries()).map(([userId, vector]) => ({
          userId,
          position: vector.position,
          force: vector.force
        })) : [];
        
        this.physicsEngine.removeWindow(windowId);
        this.io.emit('window_torn', {
          windowId,
          userVectors
        });
        console.log(`[窗口撕裂] ID: ${windowId.slice(0, 8)}`);
      }

      // 广播抢夺状态
      for (const window of this.physicsEngine.getAllWindows()) {
        if (window.isContested) {
          const contestData = this.physicsEngine.getContestedData(window.id);
          if (contestData) {
            this.io.emit('window_contested', contestData);
          }
        }
      }
    }, 1000 / 60); // 60 FPS
  }

  /**
   * 获取所有窗口
   */
  getAllWindows() {
    return this.physicsEngine.getAllWindows();
  }

  /**
   * 用户抓取窗口
   */
  grabWindow(windowId, userId) {
    const window = this.physicsEngine.grabWindow(windowId, userId);
    if (window) {
      this.io.emit('window_grabbed', {
        windowId,
        userIds: window.grabbedBy
      });
    }
    return window;
  }

  /**
   * 用户拖动窗口
   */
  dragWindow(windowId, userId, position, force) {
    return this.physicsEngine.dragWindow(windowId, userId, position, force);
  }

  /**
   * 用户释放窗口
   */
  releaseWindow(windowId, userId, velocity) {
    const window = this.physicsEngine.releaseWindow(windowId, userId, velocity);
    if (window) {
      this.io.emit('window_released', {
        windowId,
        userIds: window.grabbedBy
      });
    }
    return window;
  }

  /**
   * 处理客户端捕获确认
   * @param {string} captureId - 捕获ID
   */
  handleCaptureConfirmation(captureId) {
    if (this.pendingCaptures.has(captureId)) {
      const captureData = this.pendingCaptures.get(captureId);
      
      // 清除超时定时器
      if (captureData.timeoutId) {
        clearTimeout(captureData.timeoutId);
      }
      
      // ✅ 从防护集合中移除（捕获流程正常完成）
      const windowId = captureData.windowData.id;
      this.capturedWindowsSet.delete(windowId);
      
      // 删除待确认记录
      this.pendingCaptures.delete(captureId);
      
      // 更新统计
      this.captureStats.confirmed++;
      
      if (this.config.enable_debug_logs === '1') {
        console.log(`✅ [捕获已确认] ${captureId}`);
        console.log(`   ⏱️ 确认耗时: ${Date.now() - captureData.timestamp}ms`);
        console.log(`   🔓 窗口 ${windowId.slice(0, 8)} 已解除捕获锁定（正常完成）`);
      }
    } else {
      console.warn(`⚠️ [捕获确认失败] 未找到捕获ID: ${captureId}`);
    }
  }

  /**
   * 用户断开连接，释放所有抓取的窗口
   */
  handleUserDisconnect(userId) {
    for (const window of this.physicsEngine.getAllWindows()) {
      if (window.grabbedBy.includes(userId)) {
        this.releaseWindow(window.id, userId, null);
      }
    }
    
    // 清理该用户相关的待确认捕获
    for (const [captureId, captureData] of this.pendingCaptures.entries()) {
      if (captureData.windowData && captureData.windowData.id) {
        const windowId = captureData.windowData.id;
        
        // 如果捕获超时定时器还在，清除它
        if (captureData.timeoutId) {
          clearTimeout(captureData.timeoutId);
        }
        
        // ✅ 从防护集合中移除
        this.capturedWindowsSet.delete(windowId);
        
        this.pendingCaptures.delete(captureId);
        if (this.config.enable_debug_logs === '1') {
          console.log(`🗑️ [清理捕获] 用户断开，清理待确认捕获: ${captureId}`);
          console.log(`   🔓 窗口 ${windowId.slice(0, 8)} 已解除捕获锁定（用户断开）`);
        }
      }
    }
  }

  /**
   * ✅ 获取捕获统计信息
   */
  getCaptureStats() {
    return {
      ...this.captureStats,
      capturedWindowsCount: this.capturedWindowsSet.size,
      pendingCapturesCount: this.pendingCaptures.size,
      wallLocksActive: Object.values(this.wallAnimationLocks).filter(lock => {
        if (!lock) return false;
        const elapsed = Date.now() - lock.startTime;
        return elapsed < lock.duration;
      }).length
    };
  }

  /**
   * ✅ 调度异步碰撞处理（使用 setImmediate 避免阻塞）
   */
  scheduleCollisionProcessing() {
    if (this.isProcessingCollisions) return; // 已有处理任务在进行
    
    this.isProcessingCollisions = true;
    setImmediate(() => {
      this.processCollisionQueue();
    });
  }

  /**
   * ✅ 异步处理碰撞队列
   */
  async processCollisionQueue() {
    if (this.collisionQueue.length === 0) {
      this.isProcessingCollisions = false;
      return;
    }
    
    // 取出当前队列中的所有碰撞
    const collisionsToProcess = [...this.collisionQueue];
    this.collisionQueue = [];
    
    if (this.config.enable_debug_logs === '1') {
      console.log(`⚡ [异步碰撞处理] 开始处理 ${collisionsToProcess.length} 个碰撞事件`);
    }
    
    for (const collision of collisionsToProcess) {
      // ✅ 步骤0.1: 检查窗口是否已被捕获（全局防护）
      if (this.capturedWindowsSet.has(collision.windowId)) {
        if (this.config.enable_debug_logs === '1') {
          console.log(`⚠️ [重复捕获拒绝] 窗口 ${collision.windowId.slice(0, 8)} 已在捕获流程中，拒绝重复捕获`);
        }
        this.captureStats.rejected++;
        continue; // 跳过，防止重复捕获
      }
      
      // ✅ 步骤0.2: 检查墙壁动画锁（优先级最高）
      const lock = this.wallAnimationLocks[collision.edge];
      if (lock) {
        const elapsed = Date.now() - lock.startTime;
        if (elapsed < lock.duration) {
          // 锁仍然有效，拒绝捕获
          if (this.config.enable_debug_logs === '1') {
            console.log(`🔒 [墙壁锁定] ${collision.edge} 正在播放动画，拒绝捕获 (剩余: ${Math.ceil((lock.duration - elapsed) / 1000)}秒)`);
          }
          this.captureStats.rejected++;
          continue; // 跳过这个碰撞，窗口正常反弹
        } else {
          // 锁已过期，清除
          this.wallAnimationLocks[collision.edge] = null;
          if (this.config.enable_debug_logs === '1') {
            console.log(`🔓 [锁已过期] ${collision.edge} 动画锁已自动清除`);
          }
        }
      }
      
      // ✅ 步骤0.3: 检查该墙壁是否已在本帧被捕获
      if (this.wallCapturedThisFrame[collision.edge]) {
        if (this.config.enable_debug_logs === '1') {
          console.log(`⚠️ [本帧已捕获] ${collision.edge} 墙本帧已捕获其他窗口`);
        }
        this.captureStats.rejected++;
        continue; // 跳过，让窗口正常反弹
      }
      
      // 检查是否有墙壁主人
      const wallOwner = this.wallManager.getWallByEdge(collision.edge);
      if (wallOwner) {
        // ✅ 步骤1: 验证墙壁主人是否真实在线
        if (!this.onlineUsers.has(wallOwner.userId)) {
          console.warn(`⚠️ [墙壁验证失败] 墙壁主人 ${wallOwner.userId.slice(0, 8)} 已离线，释放 ${collision.edge} 墙`);
          this.wallManager.releaseWall(wallOwner.userId);
          // 广播墙壁状态更新
          this.io.emit('wall_state_updated', this.wallManager.getAllWalls());
          continue; // 窗口正常反弹
        }
        
        // ✅ 步骤2: 验证 Socket 连接是否正常
        const socket = this.io.sockets.sockets.get(wallOwner.socketId);
        if (!socket || !socket.connected) {
          console.warn(`⚠️ [墙壁验证失败] Socket ${wallOwner.socketId.slice(0, 8)} 已断开，释放 ${collision.edge} 墙`);
          this.wallManager.releaseWall(wallOwner.userId);
          // 广播墙壁状态更新
          this.io.emit('wall_state_updated', this.wallManager.getAllWalls());
          continue; // 窗口正常反弹
        }
        
        // 获取完整的窗口数据
        const window = this.physicsEngine.windows.get(collision.windowId);
        if (window) {
          // ✅ 立即添加到全局防护集合（最高优先级）
          this.capturedWindowsSet.add(collision.windowId);
          
          // 标记该墙壁本帧已捕获
          this.wallCapturedThisFrame[collision.edge] = true;
          
          // ✅ 步骤3: 生成唯一捕获ID
          const captureId = `${collision.windowId}_${Date.now()}`;
          
          // ✅ 步骤4: 保存窗口数据以备回滚
          const windowData = {
            id: window.id,
            message: window.message,
            position: collision.position, // 使用碰撞前的真实位置
            size: window.size,
            colors: window.colors,
            fontSize: window.fontSize,
            floatAnimation: window.floatAnimation,
            timestamp: Date.now(),
            tearBaseDuration: window.tearBaseDuration,
            shakeIntensityMultiplier: window.shakeIntensityMultiplier
          };
          
          // 移除窗口（先从物理引擎移除）
          this.physicsEngine.removeWindow(collision.windowId);
          
          // 更新统计
          this.captureStats.success++;
          
          // ✅ 步骤5: 发送捕获事件并设置超时回滚
          if (this.config.enable_debug_logs === '1') {
            console.log(`🎯 [墙壁捕获] 窗口 ${collision.windowId.slice(0, 8)} 被 ${collision.edge} 墙捕获 (主人: ${wallOwner.userId.slice(0, 8)})`);
            console.log(`   📌 捕获ID: ${captureId}`);
            console.log(`   📌 碰撞位置: (${collision.position.x.toFixed(1)}%, ${collision.position.y.toFixed(1)}%)`);
          }
          
          // 通知墙壁主人（窗口被捕获）
          socket.emit('window_captured', {
            captureId,
            windowId: collision.windowId,
            window: windowData,
            edge: collision.edge
          });
          
          // 通知其他人（窗口消失）
          this.io.except(wallOwner.socketId).emit('window_removed', {
            windowId: collision.windowId
          });
          
          // ✅ 步骤6: 设置超时，未确认则回滚（超时时间可配置）
          const confirmTimeout = parseInt(this.config.wall_capture_confirm_timeout || '2000');
          const timeoutId = setTimeout(() => {
            if (this.pendingCaptures.has(captureId)) {
              console.warn(`⚠️ [捕获超时] 捕获 ${captureId} 未在${confirmTimeout}ms内确认，回滚窗口到物理引擎`);
              this.pendingCaptures.delete(captureId);
              
              // ✅ 从防护集合中移除（允许再次捕获）
              this.capturedWindowsSet.delete(collision.windowId);
              
              // 重新添加窗口到物理引擎
              this.physicsEngine.addWindow(windowData);
              console.log(`   🔄 [窗口回滚] 窗口 ${collision.windowId.slice(0, 8)} 已恢复，解除捕获锁定`);
              
              // 更新统计
              this.captureStats.timeout++;
            }
          }, confirmTimeout);
          
          // 记录待确认的捕获
          this.pendingCaptures.set(captureId, {
            windowData,
            timestamp: Date.now(),
            timeoutId
          });
          
          // ✅ 步骤7: 设置墙壁动画锁（防止动画播放期间新窗口被捕获）
          const moveSpeed = parseInt(this.config.wall_capture_move_speed || '500');
          const captureDuration = parseInt(this.config.wall_capture_duration || '3000');
          const animationDuration = moveSpeed + captureDuration + 1000; // 总时长 + 1秒缓冲
          
          this.wallAnimationLocks[collision.edge] = {
            windowId: collision.windowId,
            startTime: Date.now(),
            duration: animationDuration
          };
          
          if (this.config.enable_debug_logs === '1') {
            console.log(`🔒 [设置锁] ${collision.edge} 墙已锁定 ${animationDuration}ms (动画播放中)`);
          }
        }
      }
    }
    
    // 处理完成，标记为可以接受新的调度
    this.isProcessingCollisions = false;
    
    // 如果队列中又有新的碰撞，继续处理
    if (this.collisionQueue.length > 0) {
      this.scheduleCollisionProcessing();
    }
  }

  /**
   * ✅ 手动清理过期的墙壁锁（用于异常情况）
   */
  cleanupExpiredLocks() {
    let cleaned = 0;
    for (const edge in this.wallAnimationLocks) {
      const lock = this.wallAnimationLocks[edge];
      if (lock) {
        const elapsed = Date.now() - lock.startTime;
        if (elapsed >= lock.duration) {
          this.wallAnimationLocks[edge] = null;
          cleaned++;
          if (this.config.enable_debug_logs === '1') {
            console.log(`🧹 [清理过期锁] ${edge} 墙的锁已清理`);
          }
        }
      }
    }
    return cleaned;
  }

  /**
   * 工具：打乱数组
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

