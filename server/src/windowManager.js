/**
 * 窗口管理器
 * 负责窗口生成、位置分配、与物理引擎协同
 */
import { v4 as uuidv4 } from 'uuid';
import { Message, Setting } from './models/Message.js';
import { PhysicsEngine } from './physicsEngine.js';

export class WindowManager {
  constructor(io) {
    this.io = io; // Socket.IO实例
    this.physicsEngine = new PhysicsEngine();
    this.config = null;
    this.generatorIntervalId = null;
    this.physicsIntervalId = null;
    this.gridPositions = [];
    this.currentGridIndex = 0;
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
      // 检查是否达到最大窗口数
      if (this.physicsEngine.getWindowCount() >= this.config.max_windows) {
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
        timestamp: Date.now()
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
    const count = Math.min(
      this.config.batch_count,
      this.config.max_windows - this.physicsEngine.getWindowCount()
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
    
    console.log(`✓ 窗口生成器已启动 (间隔: ${this.config.interval}秒, 批量: ${this.config.batch_count})`);

    // 立即生成第一批
    await this.generateBatch();

    // 定时生成
    this.generatorIntervalId = setInterval(async () => {
      if (this.physicsEngine.getWindowCount() < this.config.max_windows) {
        await this.generateBatch();
      }
    }, this.config.interval * 1000);

    // 启动物理引擎
    this.physicsEngine.start();

    // 启动物理更新广播
    this.startPhysicsBroadcast();
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

    this.physicsEngine.stop();
    this.physicsEngine.clear();
  }

  /**
   * 启动物理状态广播
   */
  startPhysicsBroadcast() {
    if (this.physicsIntervalId) return;

    this.physicsIntervalId = setInterval(() => {
      const { updates, tornWindows } = this.physicsEngine.update();

      // 广播物理更新
      if (updates.length > 0) {
        this.io.emit('physics_update', updates);
      }

      // 处理撕裂的窗口
      for (const windowId of tornWindows) {
        this.physicsEngine.removeWindow(windowId);
        this.io.emit('window_torn', windowId);
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
  dragWindow(windowId, position) {
    return this.physicsEngine.dragWindow(windowId, position);
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
   * 用户断开连接，释放所有抓取的窗口
   */
  handleUserDisconnect(userId) {
    for (const window of this.physicsEngine.getAllWindows()) {
      if (window.grabbedBy.includes(userId)) {
        this.releaseWindow(window.id, userId, null);
      }
    }
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

