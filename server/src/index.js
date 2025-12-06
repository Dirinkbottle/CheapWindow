/**
 * 多人励志弹窗系统 - 服务器主入口
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import { Message, Setting } from './models/Message.js';
import { WindowManager } from './windowManager.js';
import { WallManager } from './wallManager.js';
import { perfMonitor } from './performanceMonitor.js';
import { BatchProcessor } from './batchProcessor.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // 允许所有来源访问（生产环境建议设置具体域名）
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: '*', // 允许所有来源访问（生产环境建议设置具体域名）
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（用于生产环境）
app.use(express.static('public'));

// 窗口管理器实例
let windowManager = null;

// 墙壁管理器实例
let wallManager = null;

// 批处理器实例
let batchProcessor = null;

// 在线用户管理
const onlineUsers = new Map(); // userId -> { socketId, isMobile }

// ✅ 拖动事件节流管理
let dragBroadcastBuffer = new Map(); // windowId -> { position, timestamp, draggers: Set<userId> }
let dragBroadcastTimer = null;
let dragThrottleEnabled = true; // 默认启用节流
let dragThrottleInterval = 16; // 默认16ms（60fps）

/**
 * 检测是否为移动设备
 */
function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(ua);
}

/**
 * ✅ 批量广播拖动事件（节流机制）
 */
function flushDragBroadcasts() {
  if (dragBroadcastBuffer.size === 0) {
    dragBroadcastTimer = null;
    return;
  }
  
  // 批量广播所有缓冲的拖动事件
  for (const [windowId, data] of dragBroadcastBuffer.entries()) {
    io.emit('window_dragged', {
      windowId,
      position: data.position
    });
  }
  
  // 清空缓冲区
  dragBroadcastBuffer.clear();
  dragBroadcastTimer = null;
}

/**
 * ✅ 从配置加载节流设置
 */
async function loadDragThrottleConfig() {
  try {
    const settings = await Setting.getAll();
    dragThrottleEnabled = settings.broadcast_throttle_enabled !== '0'; // 默认启用
    dragThrottleInterval = parseInt(settings.broadcast_throttle_interval || '16');
    console.log(`✓ 拖动事件节流配置: ${dragThrottleEnabled ? '启用' : '禁用'}, 间隔: ${dragThrottleInterval}ms`);
  } catch (error) {
    console.error('加载节流配置失败:', error);
  }
}

// ==================== REST API 路由 ====================

/**
 * 健康检查
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    onlineUsers: onlineUsers.size,
    windows: windowManager ? windowManager.getAllWindows().length : 0
  });
});

/**
 * 获取所有励志话语
 */
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.getAll();
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('获取话语失败:', error);
    res.status(500).json({
      success: false,
      message: '获取话语失败'
    });
  }
});

/**
 * 创建新话语
 */
app.post('/api/messages', async (req, res) => {
  try {
    const { content, bg_color, text_color } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '话语内容不能为空'
      });
    }

    const id = await Message.create(content, bg_color, text_color);
    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('创建话语失败:', error);
    res.status(500).json({
      success: false,
      message: '创建话语失败'
    });
  }
});

/**
 * 更新话语
 */
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, bg_color, text_color } = req.body;
    
    await Message.update(id, content, bg_color, text_color);
    res.json({
      success: true
    });
  } catch (error) {
    console.error('更新话语失败:', error);
    res.status(500).json({
      success: false,
      message: '更新话语失败'
    });
  }
});

/**
 * 删除话语
 */
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Message.delete(id);
    res.json({
      success: true
    });
  } catch (error) {
    console.error('删除话语失败:', error);
    res.status(500).json({
      success: false,
      message: '删除话语失败'
    });
  }
});

/**
 * 获取系统配置
 */
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
});

/**
 * 更新系统配置
 */
app.put('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await Setting.updateMultiple(settings);
    
    // 重新加载配置
    if (windowManager) {
      await windowManager.loadConfig();
    }
    
    // ✅ 重新加载拖动节流配置
    await loadDragThrottleConfig();
    
    res.json({
      success: true
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
});

/**
 * 重置窗口状态
 */
app.post('/api/reset', async (req, res) => {
  try {
    if (windowManager && onlineUsers.size === 0) {
      windowManager.stopGenerator();
      res.json({
        success: true,
        message: '窗口状态已重置'
      });
    } else {
      res.json({
        success: false,
        message: '有用户在线，无法重置'
      });
    }
  } catch (error) {
    console.error('重置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置失败'
    });
  }
});

/**
 * ✅ 获取性能监控数据
 */
app.get('/api/performance', (req, res) => {
  try {
    const perfStats = perfMonitor.getStats();
    const perfStatus = perfMonitor.getStatus();
    const wallStats = wallManager ? wallManager.getStats() : null;
    const captureStats = windowManager ? windowManager.getCaptureStats() : null;
    
    res.json({
      success: true,
      data: {
        performance: perfStats,
        monitor: perfStatus,
        walls: wallStats,
        capture: captureStats,
        onlineUsers: onlineUsers.size,
        windows: windowManager ? windowManager.physicsEngine.getWindowCount() : 0
      }
    });
  } catch (error) {
    console.error('获取性能数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取性能数据失败'
    });
  }
});

/**
 * ✅ 更新性能监控配置
 */
app.post('/api/performance/config', (req, res) => {
  try {
    const { enabled, threshold } = req.body;
    
    if (enabled !== undefined) {
      perfMonitor.setEnabled(enabled);
    }
    if (threshold !== undefined) {
      perfMonitor.setThreshold(threshold);
    }
    
    res.json({
      success: true,
      message: '配置已更新',
      config: perfMonitor.getStatus()
    });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
});

/**
 * ✅ 重置性能监控数据
 */
app.post('/api/performance/reset', (req, res) => {
  try {
    perfMonitor.reset();
    res.json({
      success: true,
      message: '性能数据已重置'
    });
  } catch (error) {
    console.error('重置性能数据失败:', error);
    res.status(500).json({
      success: false,
      message: '重置失败'
    });
  }
});

/**
 * ✅ 更新墙壁管理器配置
 */
app.post('/api/walls/config', (req, res) => {
  try {
    if (!wallManager) {
      return res.status(400).json({
        success: false,
        message: '墙壁系统未初始化'
      });
    }
    
    const { persistenceMode, jsonFilePath, writeDelay } = req.body;
    wallManager.updateConfig({ persistenceMode, jsonFilePath, writeDelay });
    
    res.json({
      success: true,
      message: '墙壁配置已更新',
      config: wallManager.getStats()
    });
  } catch (error) {
    console.error('更新墙壁配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新失败'
    });
  }
});

// ==================== Socket.IO 事件处理 ====================

io.on('connection', async (socket) => {
  const userId = socket.id;
  const clientIp = socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'];
  const isMobile = isMobileDevice(userAgent);
  
  console.log('========================================');
  console.log('✅ [用户连接] 新用户已连接');
  console.log(`   📌 Socket ID: ${userId}`);
  console.log(`   📌 客户端IP: ${clientIp}`);
  console.log(`   📌 设备类型: ${isMobile ? '移动设备' : '桌面设备'}`);
  console.log(`   📌 User-Agent: ${userAgent?.slice(0, 50)}...`);
  console.log(`   📌 传输方式: ${socket.conn.transport.name}`);
  console.log(`   📌 当前在线: ${onlineUsers.size + 1} 人`);
  console.log('========================================');
  
  // 添加到在线用户（包含设备信息）
  onlineUsers.set(userId, { socketId: socket.id, isMobile });

  // 如果是第一个用户，启动系统
  if (onlineUsers.size === 1) {
    console.log('🚀 [系统启动] 第一个用户上线，启动系统...');
    
    // 读取性能配置
    const settings = await Setting.getAll();
    
    // ✅ 加载拖动节流配置
    await loadDragThrottleConfig();
    
    // 初始化墙壁管理器
    wallManager = new WallManager({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'cheap_window'
    }, {
      persistenceMode: settings.wall_persistence_mode || 'mysql', // memory/json/mysql
      jsonFilePath: settings.wall_json_file_path || 'data/wall_assignments.json',
      writeDelay: parseInt(settings.mysql_write_delay || '100'),
      perfMonitor
    });
    await wallManager.initialize();
    
    // 初始化窗口管理器（传递wallManager）
    windowManager = new WindowManager(io, onlineUsers, wallManager);
    await windowManager.startGenerator();
    console.log('✅ [系统启动] 窗口生成器和墙壁系统已启动');
    
    // 初始化批处理器
    const batchEnabled = settings.websocket_batch_enabled !== '0'; // 默认启用
    const batchInterval = parseInt(settings.websocket_batch_interval || '33');
    batchProcessor = new BatchProcessor(io, {
      enabled: batchEnabled,
      batchInterval,
      maxBatchSize: 100
    });
    console.log(`✅ [批处理器] ${batchEnabled ? '已启用' : '已禁用'} (间隔: ${batchInterval}ms)`);
  }

  // 为用户分配墙壁（如果启用）
  const settings = await Setting.getAll();
  if (wallManager && settings.enable_wall_system === '1') {
    const assignedWall = wallManager.assignWall(userId, socket.id);
    if (assignedWall) {
      console.log(`🧱 [墙壁分配] 用户 ${userId.slice(0, 8)} 分配到 ${assignedWall} 墙`);
    } else {
      console.log(`⏳ [墙壁等待] 用户 ${userId.slice(0, 8)} 等待墙壁空闲...`);
    }
    
    // 广播墙壁状态给所有用户
    io.emit('wall_state_updated', wallManager.getAllWalls());
    
    // ✅ 定期同步墙壁状态（防止缓存不一致）
    // 只为第一个用户启动同步定时器
    if (onlineUsers.size === 1 && !global.wallSyncInterval) {
      global.wallSyncInterval = setInterval(() => {
        if (wallManager && onlineUsers.size > 0) {
          io.emit('wall_state_sync', {
            walls: wallManager.getAllWalls(),
            timestamp: Date.now()
          });
          console.log('🔄 [墙壁同步] 定期广播墙壁状态');
        }
      }, 10000); // 每10秒同步一次
      console.log('✅ [墙壁同步] 定期同步任务已启动 (10秒间隔)');
    }
  }

  // 发送当前所有窗口状态给新连接的用户
  const windows = windowManager.getAllWindows();
  socket.emit('sync_windows', windows);
  console.log(`📦 [数据同步] 发送 ${windows.length} 个窗口给用户 ${userId.slice(0, 8)}`);

  /**
   * 用户抓取窗口
   */
  socket.on('grab_window', (windowId) => {
    if (!windowManager) return;
    
    windowManager.grabWindow(windowId, userId);
    console.log(`[抓取] 用户 ${userId.slice(0, 8)} 抓取窗口 ${windowId.slice(0, 8)}`);
  });

  /**
   * 用户拖动窗口
   */
  socket.on('drag_window', ({ windowId, position, force }) => {
    if (!windowManager) return;
    
    // 传入 userId 和 force 用于多人拖动的向量加权计算
    const window = windowManager.dragWindow(windowId, userId, position, force || 1.0);
    if (window) {
      // ✅ 检查是否启用节流
      if (dragThrottleEnabled) {
        // 节流模式：缓冲拖动事件
        if (!dragBroadcastBuffer.has(windowId)) {
          dragBroadcastBuffer.set(windowId, {
            position: window.position,
            timestamp: Date.now(),
            draggers: new Set([userId])
          });
        } else {
          const buffered = dragBroadcastBuffer.get(windowId);
          buffered.position = window.position;
          buffered.timestamp = Date.now();
          buffered.draggers.add(userId);
        }
        
        // 调度批量广播
        if (!dragBroadcastTimer) {
          dragBroadcastTimer = setTimeout(() => {
            flushDragBroadcasts();
          }, dragThrottleInterval);
        }
      } else {
        // 非节流模式：立即广播（原有逻辑）
        io.emit('window_dragged', {
          windowId,
          position: window.position
        });
      }
    }
  });

  /**
   * 用户释放窗口
   */
  socket.on('release_window', ({ windowId, velocity }) => {
    if (!windowManager) return;
    
    windowManager.releaseWindow(windowId, userId, velocity);
    console.log(`[释放] 用户 ${userId.slice(0, 8)} 释放窗口 ${windowId.slice(0, 8)}`);
  });

  /**
   * ✅ 客户端确认捕获
   */
  socket.on('capture_confirmed', (captureId) => {
    if (!windowManager) return;
    
    windowManager.handleCaptureConfirmation(captureId);
  });

  /**
   * 用户断开连接
   */
  socket.on('disconnect', async (reason) => {
    console.log('========================================');
    console.log('⚠️ [用户断开] 用户已断开连接');
    console.log(`   📌 Socket ID: ${userId.slice(0, 8)}`);
    console.log(`   📌 断开原因: ${reason}`);
    console.log(`   📌 剩余在线: ${onlineUsers.size - 1} 人`);
    console.log('========================================');
    
    // 释放用户的墙壁
    if (wallManager) {
      const releasedWall = wallManager.releaseWall(userId);
      if (releasedWall) {
        // 广播墙壁状态更新
        io.emit('wall_state_updated', wallManager.getAllWalls());
      }
    }
    
    // 释放用户抓取的所有窗口
    if (windowManager) {
      windowManager.handleUserDisconnect(userId);
    }
    
    // 从在线用户中移除
    onlineUsers.delete(userId);

    // 如果是最后一个用户，停止系统
    if (onlineUsers.size === 0) {
      console.log('🛑 [系统停止] 最后一个用户离线，停止窗口生成器...');
      if (windowManager) {
        windowManager.stopGenerator();
        windowManager = null;
      }
      if (wallManager) {
        await wallManager.close();
        wallManager = null;
      }
      // ✅ 停止墙壁状态同步定时器
      if (global.wallSyncInterval) {
        clearInterval(global.wallSyncInterval);
        global.wallSyncInterval = null;
        console.log('✅ [墙壁同步] 定期同步任务已停止');
      }
      console.log('✅ [系统停止] 系统已完全停止');
    }
  });
});

// ==================== 启动服务器 ====================

async function startServer() {
  try {
    console.log('='.repeat(60));
    console.log('多人励志弹窗系统 - 服务器启动中...');
    console.log('='.repeat(60));

    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('数据库连接失败，请检查配置');
      process.exit(1);
    }

    // 启动HTTP服务器（监听所有网络接口，支持公网访问）
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(60));
      console.log(`✓ 服务器运行在: http://0.0.0.0:${PORT}`);
      console.log(`✓ 本地访问: http://localhost:${PORT}`);
      console.log(`✓ 公网访问: http://你的公网IP:${PORT}`);
      console.log(`✓ WebSocket服务已启用`);
      console.log('='.repeat(60));
    });

  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  httpServer.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n收到SIGINT信号，正在关闭服务器...');
  httpServer.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 启动
startServer();

