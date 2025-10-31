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

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件（用于生产环境）
app.use(express.static('public'));

// 窗口管理器实例
let windowManager = null;

// 在线用户管理
const onlineUsers = new Map(); // userId -> socketId

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

// ==================== Socket.IO 事件处理 ====================

io.on('connection', async (socket) => {
  const userId = socket.id;
  console.log(`[用户连接] ${userId}`);
  
  // 添加到在线用户
  onlineUsers.set(userId, socket.id);

  // 如果是第一个用户，启动窗口生成器
  if (onlineUsers.size === 1) {
    console.log('✓ 第一个用户上线，启动系统...');
    windowManager = new WindowManager(io);
    await windowManager.startGenerator();
  }

  // 发送当前所有窗口状态给新连接的用户
  const windows = windowManager.getAllWindows();
  socket.emit('sync_windows', windows);
  console.log(`[同步窗口] 发送 ${windows.length} 个窗口给用户 ${userId}`);

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
  socket.on('drag_window', ({ windowId, position }) => {
    if (!windowManager) return;
    
    const window = windowManager.dragWindow(windowId, position);
    if (window) {
      // 广播给其他用户（不包括自己，避免延迟）
      socket.broadcast.emit('window_dragged', {
        windowId,
        position: window.position
      });
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
   * 用户断开连接
   */
  socket.on('disconnect', () => {
    console.log(`[用户断开] ${userId}`);
    
    // 释放用户抓取的所有窗口
    if (windowManager) {
      windowManager.handleUserDisconnect(userId);
    }
    
    // 从在线用户中移除
    onlineUsers.delete(userId);

    // 如果是最后一个用户，停止系统
    if (onlineUsers.size === 0) {
      console.log('✓ 最后一个用户离线，停止系统...');
      if (windowManager) {
        windowManager.stopGenerator();
        windowManager = null;
      }
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

    // 启动HTTP服务器
    httpServer.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log(`✓ 服务器运行在: http://localhost:${PORT}`);
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

