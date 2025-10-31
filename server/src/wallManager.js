/**
 * 墙壁管理器（优化版）
 * 管理4个墙壁槽位，分配给在线用户
 * 使用内存优先 + 异步持久化架构，提升性能
 */

import mysql from 'mysql2/promise';
import { promises as fs } from 'fs';
import path from 'path';
import { perfMonitor } from './performanceMonitor.js';

// 墙壁分配顺序
const WALL_ORDER = ['top', 'right', 'bottom', 'left'];

export class WallManager {
  constructor(dbConfig, config = {}) {
    // 4个墙壁槽位（内存缓存）
    this.walls = {
      top: null,
      right: null,
      bottom: null,
      left: null
    };
    
    // 用户到墙壁的映射 (userId -> wallEdge)
    this.userWallMap = new Map();
    
    // 数据库配置
    this.dbConfig = dbConfig;
    this.dbPool = null;
    
    // ✅ 持久化模式配置 (memory/json/mysql)
    this.persistenceMode = config.persistenceMode || 'mysql';
    this.jsonFilePath = config.jsonFilePath || path.join(process.cwd(), 'data', 'wall_assignments.json');
    
    // ✅ 性能优化配置
    this.writeDelay = config.writeDelay || 100; // 批量写入延迟（毫秒）
    this.writeQueue = []; // 待写入队列
    this.flushTimer = null; // 刷新定时器
    this.perfMonitor = config.perfMonitor || perfMonitor; // 性能监控实例
    
    console.log('✓ 墙壁管理器已初始化');
    console.log(`  - 持久化模式: ${this.persistenceMode}`);
    console.log(`  - JSON文件路径: ${this.jsonFilePath}`);
    console.log(`  - 写入延迟: ${this.writeDelay}ms`);
  }

  /**
   * 初始化数据库连接和表结构
   */
  async initialize() {
    try {
      // 根据持久化模式初始化
      if (this.persistenceMode === 'mysql') {
        // MySQL 模式
        this.dbPool = mysql.createPool(this.dbConfig);
        
        // 创建墙壁分配表
        await this.dbPool.execute(`
          CREATE TABLE IF NOT EXISTS wall_assignments (
            edge VARCHAR(10) PRIMARY KEY COMMENT '墙壁边缘: top/right/bottom/left',
            user_id VARCHAR(100) NOT NULL COMMENT '用户ID (socketId)',
            socket_id VARCHAR(100) NOT NULL COMMENT 'Socket连接ID',
            assigned_at BIGINT NOT NULL COMMENT '分配时间戳',
            INDEX idx_user_id (user_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='墙壁分配表';
        `);
        
        // 从数据库加载现有分配
        await this.loadFromDatabase();
        console.log('✓ 墙壁管理器（MySQL模式）初始化完成');
        
      } else if (this.persistenceMode === 'json') {
        // JSON 模式
        await this.ensureDataDirectory();
        await this.loadFromJSON();
        console.log('✓ 墙壁管理器（JSON模式）初始化完成');
        
      } else {
        // Memory 模式
        console.log('✓ 墙壁管理器（纯内存模式）初始化完成');
        console.log('  ⚠️ 重启后墙壁分配数据将丢失');
      }
      
    } catch (error) {
      console.error('✗ 墙壁管理器初始化失败:', error);
    }
  }

  /**
   * 从数据库加载墙壁分配
   */
  async loadFromDatabase() {
    try {
      const [rows] = await this.dbPool.execute(
        'SELECT edge, user_id, socket_id, assigned_at FROM wall_assignments'
      );
      
      for (const row of rows) {
        this.walls[row.edge] = {
          userId: row.user_id,
          socketId: row.socket_id,
          assignedAt: row.assigned_at
        };
        this.userWallMap.set(row.user_id, row.edge);
      }
      
      console.log(`✓ 从数据库加载了 ${rows.length} 个墙壁分配`);
    } catch (error) {
      console.error('✗ 加载墙壁分配失败:', error);
    }
  }

  /**
   * ✅ 确保数据目录存在
   */
  async ensureDataDirectory() {
    const dir = path.dirname(this.jsonFilePath);
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ 数据目录已准备: ${dir}`);
    } catch (error) {
      console.error('✗ 创建数据目录失败:', error);
    }
  }

  /**
   * ✅ 从 JSON 文件加载墙壁分配
   */
  async loadFromJSON() {
    const timer = this.perfMonitor.startTimer('jsonReads');
    
    try {
      const data = await fs.readFile(this.jsonFilePath, 'utf8');
      const saved = JSON.parse(data);
      
      // 恢复墙壁分配
      for (const edge of WALL_ORDER) {
        if (saved.walls[edge]) {
          this.walls[edge] = saved.walls[edge];
          this.userWallMap.set(saved.walls[edge].userId, edge);
        }
      }
      
      const duration = timer.end();
      console.log(`✓ 从 JSON 文件加载了墙壁分配 (耗时: ${duration}ms)`);
      console.log(`  - 已分配墙壁: ${Object.values(this.walls).filter(w => w !== null).length}/4`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 JSON 文件不存在，将创建新文件');
        await this.saveToJSON(); // 创建初始文件
      } else {
        console.error('✗ 从 JSON 加载失败:', error);
      }
      timer.end();
    }
  }

  /**
   * ✅ 保存墙壁分配到 JSON 文件
   */
  async saveToJSON() {
    const timer = this.perfMonitor.startTimer('jsonWrites');
    
    try {
      const data = {
        walls: this.walls,
        lastUpdate: Date.now(),
        version: '1.0'
      };
      
      await fs.writeFile(
        this.jsonFilePath, 
        JSON.stringify(data, null, 2),
        'utf8'
      );
      
      const duration = timer.end();
      console.log(`✓ 墙壁分配已保存到 JSON (耗时: ${duration}ms)`);
      
    } catch (error) {
      console.error('✗ 保存到 JSON 失败:', error);
      timer.end();
    }
  }

  /**
   * 保存墙壁分配到数据库
   */
  async saveToDatabase(edge, wallOwner) {
    if (!this.dbPool) return;
    
    try {
      if (wallOwner) {
        // 插入或更新
        await this.dbPool.execute(
          `INSERT INTO wall_assignments (edge, user_id, socket_id, assigned_at) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           user_id = VALUES(user_id), 
           socket_id = VALUES(socket_id), 
           assigned_at = VALUES(assigned_at)`,
          [edge, wallOwner.userId, wallOwner.socketId, wallOwner.assignedAt]
        );
      } else {
        // 删除
        await this.dbPool.execute(
          'DELETE FROM wall_assignments WHERE edge = ?',
          [edge]
        );
      }
    } catch (error) {
      console.error(`✗ 保存墙壁分配失败 (${edge}):`, error);
    }
  }

  /**
   * 分配墙壁给用户（同步操作，性能优化）
   * @param {string} userId - 用户ID (socketId)
   * @param {string} socketId - Socket连接ID
   * @returns {string|null} 分配的墙壁边缘，如果没有空闲墙壁则返回null
   */
  assignWall(userId, socketId) {
    const timer = this.perfMonitor.startTimer('assignments');
    
    // 检查用户是否已经有墙壁
    if (this.userWallMap.has(userId)) {
      const existingWall = this.userWallMap.get(userId);
      // 更新socketId（处理重连情况）
      this.walls[existingWall].socketId = socketId;
      this.queueWrite(existingWall, this.walls[existingWall]);
      console.log(`✓ 用户 ${userId.substring(0, 8)} 重连，墙壁保持: ${existingWall}`);
      timer.end();
      return existingWall;
    }

    // 按顺序查找空闲墙壁
    for (const edge of WALL_ORDER) {
      if (!this.walls[edge]) {
        this.walls[edge] = {
          userId,
          socketId,
          assignedAt: Date.now()
        };
        this.userWallMap.set(userId, edge);
        this.queueWrite(edge, this.walls[edge]);
        console.log(`✓ 分配墙壁 ${edge} 给用户 ${userId.substring(0, 8)}`);
        timer.end();
        return edge;
      }
    }

    // 没有空闲墙壁
    console.log(`✗ 墙壁已满，用户 ${userId.substring(0, 8)} 无法分配`);
    timer.end();
    return null;
  }

  /**
   * 释放用户的墙壁（同步操作，性能优化）
   * @param {string} userId - 用户ID
   */
  releaseWall(userId) {
    const timer = this.perfMonitor.startTimer('releases');
    
    const edge = this.userWallMap.get(userId);
    if (edge) {
      this.walls[edge] = null;
      this.userWallMap.delete(userId);
      this.queueWrite(edge, null);
      console.log(`✓ 释放墙壁 ${edge} (用户 ${userId.substring(0, 8)} 断开)`);
      timer.end();
      return edge;
    }
    timer.end();
    return null;
  }

  /**
   * ✅ 队列化写入（异步持久化）
   * @param {string} edge - 墙壁边缘
   * @param {object|null} data - 墙壁数据
   */
  queueWrite(edge, data) {
    if (this.persistenceMode === 'memory') return; // 纯内存模式跳过
    
    // 添加到队列
    this.writeQueue.push({
      edge,
      data,
      timestamp: Date.now()
    });
    
    // 调度刷新
    this.scheduleFlush();
  }

  /**
   * ✅ 调度刷新
   */
  scheduleFlush() {
    if (this.flushTimer) return; // 已有定时器
    
    this.flushTimer = setTimeout(() => {
      this.flushWrites();
      this.flushTimer = null;
    }, this.writeDelay);
  }

  /**
   * ✅ 刷新写入队列
   */
  async flushWrites() {
    if (this.writeQueue.length === 0) return;
    
    const writes = [...this.writeQueue];
    this.writeQueue = [];
    
    // 根据持久化模式选择不同的写入方式
    if (this.persistenceMode === 'mysql') {
      const timer = this.perfMonitor.startTimer('dbWrites');
      console.log(`⚡ [批量写入] 正在写入 ${writes.length} 条墙壁记录到 MySQL...`);
      
      for (const { edge, data } of writes) {
        try {
          await this.saveToDatabase(edge, data);
        } catch (error) {
          console.error(`✗ [写入失败] ${edge}:`, error.message);
        }
      }
      
      const duration = timer.end();
      console.log(`✓ [批量写入完成] 耗时: ${duration}ms`);
      
    } else if (this.persistenceMode === 'json') {
      // JSON 模式：直接保存整个状态
      console.log(`⚡ [JSON写入] 正在保存墙壁状态到 JSON 文件...`);
      await this.saveToJSON();
    }
  }

  /**
   * 获取指定边缘的墙壁信息
   * @param {string} edge - 墙壁边缘
   * @returns {object|null} 墙壁主人信息
   */
  getWallByEdge(edge) {
    return this.walls[edge];
  }

  /**
   * 获取所有墙壁状态
   * @returns {object} 墙壁状态对象
   */
  getAllWalls() {
    return { ...this.walls };
  }

  /**
   * 获取用户拥有的墙壁
   * @param {string} userId - 用户ID
   * @returns {string|null} 墙壁边缘
   */
  getUserWall(userId) {
    return this.userWallMap.get(userId) || null;
  }

  /**
   * 检查是否还有空闲墙壁
   * @returns {boolean}
   */
  hasAvailableWall() {
    return WALL_ORDER.some(edge => !this.walls[edge]);
  }

  /**
   * 获取空闲墙壁数量
   * @returns {number}
   */
  getAvailableWallCount() {
    return WALL_ORDER.filter(edge => !this.walls[edge]).length;
  }

  /**
   * 清空所有墙壁分配（用于测试或重置）
   */
  async clearAll() {
    if (this.dbPool) {
      try {
        await this.dbPool.execute('DELETE FROM wall_assignments');
      } catch (error) {
        console.error('✗ 清空墙壁分配失败:', error);
      }
    }
    
    this.walls = {
      top: null,
      right: null,
      bottom: null,
      left: null
    };
    this.userWallMap.clear();
    console.log('✓ 所有墙壁分配已清空');
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    // ✅ 关闭前刷新所有待写入
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushWrites();
    
    if (this.dbPool) {
      await this.dbPool.end();
      console.log('✓ 墙壁管理器数据库连接已关闭');
    }
  }

  /**
   * ✅ 配置更新（动态配置）
   */
  updateConfig(config) {
    if (config.persistenceMode !== undefined) {
      const oldMode = this.persistenceMode;
      this.persistenceMode = config.persistenceMode;
      console.log(`✓ 持久化模式已更改: ${oldMode} → ${this.persistenceMode}`);
      
      // 如果切换到非内存模式，立即保存当前状态
      if (this.persistenceMode !== 'memory') {
        this.queueWrite('all', null); // 触发保存
      }
    }
    if (config.jsonFilePath !== undefined) {
      this.jsonFilePath = config.jsonFilePath;
      console.log(`✓ JSON文件路径设置为: ${this.jsonFilePath}`);
    }
    if (config.writeDelay !== undefined) {
      this.writeDelay = config.writeDelay;
      console.log(`✓ 写入延迟设置为: ${this.writeDelay}ms`);
    }
  }

  /**
   * ✅ 获取统计信息
   */
  getStats() {
    return {
      wallsAssigned: Object.values(this.walls).filter(w => w !== null).length,
      wallsAvailable: Object.values(this.walls).filter(w => w === null).length,
      queuedWrites: this.writeQueue.length,
      persistenceMode: this.persistenceMode,
      jsonFilePath: this.jsonFilePath,
      writeDelay: this.writeDelay
    };
  }
}

