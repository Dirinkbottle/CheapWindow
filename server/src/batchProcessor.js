/**
 * 网络批处理与压缩 - 减少WebSocket流量
 * 
 * 功能：
 * - 智能批处理（按消息类型分组）
 * - 增量压缩（仅发送变化的数据）
 * - 自适应批次大小
 * 
 * 性能目标：
 * - 减少60%网络流量
 * - 延迟<50ms
 * - CPU开销<5%
 */

export class BatchProcessor {
  constructor(io, options = {}) {
    this.io = io;
    this.enabled = options.enabled !== false;
    this.batchInterval = options.batchInterval || 33; // 33ms = 30fps
    this.maxBatchSize = options.maxBatchSize || 100;
    
    // 消息缓冲区（按类型分组）
    this.buffers = {
      physics: [],        // 物理引擎更新
      dragging: [],       // 拖动事件
      contested: [],      // 争夺状态
      captured: [],       // 墙壁捕获
      torn: [],           // 窗口撕裂
      general: []         // 其他消息
    };
    
    // 上一次状态（用于增量压缩）
    this.previousState = {
      windows: new Map(),
      wallState: {},
      draggers: new Map()
    };
    
    // 统计
    this.stats = {
      messagesBuffered: 0,
      batchesSent: 0,
      bytesSaved: 0,
      avgCompressionRatio: 0
    };
    
    // 定时器
    this.timer = null;
    
    if (this.enabled) {
      this.start();
    }
  }
  
  /**
   * 启动批处理
   */
  start() {
    if (this.timer) return;
    
    this.timer = setInterval(() => {
      this.flush();
    }, this.batchInterval);
    
    console.log(`[BatchProcessor] Started (interval: ${this.batchInterval}ms)`);
  }
  
  /**
   * 停止批处理
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.flush(); // 发送剩余消息
    }
    
    console.log('[BatchProcessor] Stopped');
  }
  
  /**
   * 添加消息到缓冲区
   */
  add(type, data, priority = 'general') {
    if (!this.enabled) {
      // 禁用批处理时直接发送
      this.io.emit(type, data);
      return;
    }
    
    const category = this.categorizeMessage(type, priority);
    this.buffers[category].push({ type, data, timestamp: Date.now() });
    this.stats.messagesBuffered++;
    
    // 如果缓冲区过大，立即刷新
    if (this.buffers[category].length >= this.maxBatchSize) {
      this.flushCategory(category);
    }
  }
  
  /**
   * 分类消息
   */
  categorizeMessage(type, priority) {
    if (type.includes('physics')) return 'physics';
    if (type.includes('drag')) return 'dragging';
    if (type.includes('contested')) return 'contested';
    if (type.includes('captured')) return 'captured';
    if (type.includes('torn')) return 'torn';
    
    if (priority === 'high') {
      // 高优先级消息不缓冲
      return null;
    }
    
    return 'general';
  }
  
  /**
   * 刷新所有缓冲区
   */
  flush() {
    Object.keys(this.buffers).forEach(category => {
      this.flushCategory(category);
    });
  }
  
  /**
   * 刷新指定类别的缓冲区
   */
  flushCategory(category) {
    const buffer = this.buffers[category];
    if (buffer.length === 0) return;
    
    // 构建批次
    const batch = {
      category,
      timestamp: Date.now(),
      messages: buffer.splice(0)
    };
    
    // 增量压缩
    let compressed = batch;
    if (category === 'physics' || category === 'dragging') {
      compressed = this.compressDelta(batch, category);
    }
    
    // 计算压缩率
    const originalSize = JSON.stringify(batch).length;
    const compressedSize = JSON.stringify(compressed).length;
    const saved = originalSize - compressedSize;
    
    if (saved > 0) {
      this.stats.bytesSaved += saved;
      const ratio = (compressedSize / originalSize) * 100;
      this.stats.avgCompressionRatio = 
        (this.stats.avgCompressionRatio * this.stats.batchesSent + ratio) / 
        (this.stats.batchesSent + 1);
    }
    
    // 发送批次
    this.io.emit('batch_update', compressed);
    this.stats.batchesSent++;
  }
  
  /**
   * 增量压缩 - 仅发送变化的数据
   */
  compressDelta(batch, category) {
    if (category !== 'physics' && category !== 'dragging') {
      return batch;
    }
    
    const changes = {
      category: batch.category,
      timestamp: batch.timestamp,
      added: [],
      removed: [],
      updated: []
    };
    
    // 构建当前状态
    const currentState = new Map();
    batch.messages.forEach(msg => {
      if (msg.data.windowId) {
        currentState.set(msg.data.windowId, msg.data);
      }
    });
    
    // 对比上一次状态
    const prevState = category === 'physics' 
      ? this.previousState.windows 
      : this.previousState.draggers;
    
    // 找出新增
    for (const [id, data] of currentState) {
      if (!prevState.has(id)) {
        changes.added.push(data);
      } else {
        // 检查是否有变化
        const prev = prevState.get(id);
        if (this.hasChanges(prev, data)) {
          changes.updated.push({
            id,
            ...this.getDifference(prev, data)
          });
        }
      }
    }
    
    // 找出移除
    for (const id of prevState.keys()) {
      if (!currentState.has(id)) {
        changes.removed.push(id);
      }
    }
    
    // 更新上一次状态
    if (category === 'physics') {
      this.previousState.windows = currentState;
    } else {
      this.previousState.draggers = currentState;
    }
    
    // 如果没有变化，返回空
    if (changes.added.length === 0 && 
        changes.removed.length === 0 && 
        changes.updated.length === 0) {
      return null;
    }
    
    return changes;
  }
  
  /**
   * 检查对象是否有变化
   */
  hasChanges(prev, current) {
    // 位置变化检测（阈值0.1像素）
    if (prev.position && current.position) {
      const dx = Math.abs(prev.position.x - current.position.x);
      const dy = Math.abs(prev.position.y - current.position.y);
      if (dx > 0.1 || dy > 0.1) return true;
    }
    
    // 其他关键字段
    const keys = ['contested', 'capturedBy', 'isDragging'];
    for (const key of keys) {
      if (prev[key] !== current[key]) return true;
    }
    
    return false;
  }
  
  /**
   * 获取对象差异
   */
  getDifference(prev, current) {
    const diff = {};
    
    // 位置
    if (prev.position && current.position) {
      const dx = current.position.x - prev.position.x;
      const dy = current.position.y - prev.position.y;
      if (dx !== 0 || dy !== 0) {
        diff.positionDelta = { dx, dy };
      }
    }
    
    // 其他字段
    ['contested', 'capturedBy', 'isDragging'].forEach(key => {
      if (prev[key] !== current[key]) {
        diff[key] = current[key];
      }
    });
    
    return diff;
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      bufferSizes: Object.entries(this.buffers).reduce((acc, [key, buffer]) => {
        acc[key] = buffer.length;
        return acc;
      }, {}),
      bytesSavedKB: (this.stats.bytesSaved / 1024).toFixed(2),
      avgCompressionRatio: this.stats.avgCompressionRatio.toFixed(1) + '%'
    };
  }
  
  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      messagesBuffered: 0,
      batchesSent: 0,
      bytesSaved: 0,
      avgCompressionRatio: 0
    };
  }
}

/**
 * 客户端批处理解析器（用于客户端解压）
 */
export class BatchDecoder {
  constructor() {
    this.currentState = new Map();
  }
  
  /**
   * 解码批次更新
   */
  decode(batch) {
    if (!batch) return [];
    
    // 标准批次
    if (batch.messages) {
      return batch.messages.map(msg => ({
        type: msg.type,
        data: msg.data
      }));
    }
    
    // 增量批次
    if (batch.added || batch.updated || batch.removed) {
      const messages = [];
      
      // 处理新增
      batch.added?.forEach(data => {
        this.currentState.set(data.windowId, data);
        messages.push({ type: 'window_update', data });
      });
      
      // 处理更新
      batch.updated?.forEach(update => {
        const current = this.currentState.get(update.id) || {};
        
        // 应用位置增量
        if (update.positionDelta && current.position) {
          current.position.x += update.positionDelta.dx;
          current.position.y += update.positionDelta.dy;
        }
        
        // 应用其他字段
        Object.assign(current, update);
        this.currentState.set(update.id, current);
        messages.push({ type: 'window_update', data: current });
      });
      
      // 处理删除
      batch.removed?.forEach(id => {
        this.currentState.delete(id);
        messages.push({ type: 'window_removed', data: { windowId: id } });
      });
      
      return messages;
    }
    
    return [];
  }
}

