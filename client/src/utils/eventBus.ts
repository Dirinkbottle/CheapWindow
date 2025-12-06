/**
 * 事件总线 - 用于双根模式下主应用和动画应用的通信
 * 单根模式下不使用此模块
 * 
 * 增强功能：
 * - 消息确认-重传机制
 * - 消息优先级管理
 * - 性能监控
 */

type EventCallback = (data: any) => void;

export type EventBusEvents = 
  | 'WINDOW_TORN'          // 窗口撕裂事件
  | 'WINDOW_CAPTURED'      // 窗口被墙壁捕获事件
  | 'WALL_STATE_UPDATED'   // 墙壁状态更新事件
  | 'SETTINGS_UPDATED'     // 配置更新事件
  | 'USER_VECTORS_UPDATE'  // 用户向量更新（撕裂动画用）
  | 'FRAME_SYNC'           // 帧同步事件
  | 'FORCE_SYNC'           // 强制同步事件
  | 'ACK';                 // 确认消息

interface PendingMessage {
  event: EventBusEvents;
  data: any;
  timestamp: number;
  retryCount: number;
  resolve?: () => void;
  reject?: (error: Error) => void;
}

const MAX_RETRIES = 3;
const ACK_TIMEOUT = 1000; // 1秒超时
const MAX_QUEUE_SIZE = 1000; // 防止队列爆炸

class EventBus {
  private listeners: Map<EventBusEvents, Set<EventCallback>>;
  private eventQueue: Array<{ event: EventBusEvents; data: any; priority: number }>;
  private isProcessing: boolean;
  private pendingAcks: Map<string, PendingMessage>;
  private enableReliableMode: boolean = false;
  
  // 性能监控
  private stats = {
    sent: 0,
    delivered: 0,
    retried: 0,
    failed: 0,
    queueOverflows: 0
  };

  constructor() {
    this.listeners = new Map();
    this.eventQueue = [];
    this.isProcessing = false;
    this.pendingAcks = new Map();
  }
  
  /**
   * 启用/禁用可靠消息模式
   */
  setReliableMode(enabled: boolean): void {
    this.enableReliableMode = enabled;
  }

  /**
   * 订阅事件
   */
  on(event: EventBusEvents, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * 取消订阅
   */
  off(event: EventBusEvents, callback: EventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 发布事件（带优先级）
   * 使用 queueMicrotask 确保事件异步处理，不阻塞当前调用栈
   */
  emit(event: EventBusEvents, data?: any, priority: number = 50): void {
    // 队列保护
    if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
      console.error('[EventBus] 队列溢出，丢弃消息');
      this.stats.queueOverflows++;
      return;
    }
    
    this.eventQueue.push({ event, data, priority });
    this.stats.sent++;

    if (!this.isProcessing) {
      this.isProcessing = true;
      queueMicrotask(() => {
        this.processQueue();
      });
    }
  }
  
  /**
   * 发布可靠消息（需要确认）
   */
  emitReliable(event: EventBusEvents, data?: any): Promise<void> {
    if (!this.enableReliableMode) {
      this.emit(event, data);
      return Promise.resolve();
    }
    
    const messageId = this.generateMessageId();
    
    return new Promise((resolve, reject) => {
      this.pendingAcks.set(messageId, {
        event,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject
      });
      
      // 发送消息（附带ACK ID）
      this.emit(event, { ...data, __ackId: messageId }, 100); // 高优先级
      
      // 设置超时
      setTimeout(() => {
        this.handleAckTimeout(messageId);
      }, ACK_TIMEOUT);
    });
  }
  
  /**
   * 确认消息接收
   */
  ack(messageId: string): void {
    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      pending.resolve?.();
      this.pendingAcks.delete(messageId);
      this.stats.delivered++;
    }
  }
  
  /**
   * 处理ACK超时
   */
  private handleAckTimeout(messageId: string): void {
    const pending = this.pendingAcks.get(messageId);
    if (!pending) return; // 已经确认
    
    pending.retryCount++;
    
    if (pending.retryCount < MAX_RETRIES) {
      console.warn(`[EventBus] 消息 ${messageId} 超时，重试 ${pending.retryCount}/${MAX_RETRIES}`);
      this.stats.retried++;
      
      // 重新发送
      this.emit(pending.event, pending.data, 100);
      
      // 重新设置超时
      setTimeout(() => {
        this.handleAckTimeout(messageId);
      }, ACK_TIMEOUT);
    } else {
      console.error(`[EventBus] 消息 ${messageId} 达到最大重试次数，放弃`);
      pending.reject?.(new Error('Message delivery failed after retries'));
      this.pendingAcks.delete(messageId);
      this.stats.failed++;
    }
  }
  
  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 处理事件队列（带优先级排序）
   */
  private processQueue(): void {
    // 按优先级排序（高优先级先处理）
    this.eventQueue.sort((a, b) => b.priority - a.priority);
    
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!;
      const callbacks = this.listeners.get(event);

      if (callbacks && callbacks.size > 0) {
        callbacks.forEach(callback => {
          try {
            callback(data);
            
            // 自动ACK处理
            if (data?.__ackId && this.enableReliableMode) {
              this.ack(data.__ackId);
            }
          } catch (error) {
            console.error(`[EventBus] Error in callback for event "${event}":`, error);
          }
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.listeners.clear();
    this.eventQueue = [];
    this.isProcessing = false;
  }

  /**
   * 获取调试信息（增强版）
   */
  getDebugInfo(): Record<string, any> {
    const info: Record<string, any> = {
      queueLength: this.eventQueue.length,
      pendingAcks: this.pendingAcks.size,
      reliableMode: this.enableReliableMode,
      stats: { ...this.stats }
    };

    this.listeners.forEach((callbacks, event) => {
      info[`${event}_listeners`] = callbacks.size;
    });

    return info;
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      deliveryRate: this.stats.sent > 0 
        ? ((this.stats.delivered / this.stats.sent) * 100).toFixed(2) + '%'
        : '0%',
      retryRate: this.stats.sent > 0
        ? ((this.stats.retried / this.stats.sent) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// 导出单例实例（仅在双根模式下使用）
export const eventBus = new EventBus();

// 导出类型，方便其他模块使用
export type { EventCallback };

