/**
 * 动画管理器 - 统一管理所有动画的生命周期
 * 负责：动画注册、调度、优先级管理、帧预算分配
 */

export type AnimationType = 'tear' | 'capture' | 'border';
export type AnimationPriority = 'high' | 'medium' | 'low';

interface Animation {
  id: string;
  type: AnimationType;
  priority: AnimationPriority;
  startTime: number;
  duration: number;
  progress: number;
  isComplete: boolean;
  data: any;
}

const PRIORITY_MAP: Record<AnimationPriority, number> = {
  high: 100,    // 用户触发的撕裂动画
  medium: 50,   // 墙壁捕获动画
  low: 10       // 墙壁边框高亮
};

const TARGET_FPS = 60;
const FRAME_BUDGET = 1000 / TARGET_FPS; // ~16.67ms

export class AnimationManager {
  private animations: Map<string, Animation>;
  private completedIds: Set<string>;
  private frameStartTime: number = 0;
  
  constructor() {
    this.animations = new Map();
    this.completedIds = new Set();
  }

  /**
   * 注册动画
   */
  registerAnimation(
    id: string,
    type: AnimationType,
    priority: AnimationPriority,
    duration: number,
    data: any
  ): void {
    if (this.animations.has(id)) {
      console.warn(`[AnimationManager] 动画 ${id} 已存在，跳过注册`);
      return;
    }

    const animation: Animation = {
      id,
      type,
      priority,
      startTime: performance.now(),
      duration,
      progress: 0,
      isComplete: false,
      data
    };

    this.animations.set(id, animation);
    console.log(`[AnimationManager] 注册动画: ${id} (${type}, ${priority})`);
  }

  /**
   * 更新所有动画状态
   */
  updateAll(timestamp: number): void {
    this.frameStartTime = timestamp;

    for (const [id, animation] of this.animations.entries()) {
      if (animation.isComplete) continue;

      const elapsed = timestamp - animation.startTime;
      animation.progress = Math.min(elapsed / animation.duration, 1);

      if (animation.progress >= 1) {
        animation.isComplete = true;
        this.completedIds.add(id);
        console.log(`[AnimationManager] 动画完成: ${id}`);
      }
    }
  }

  /**
   * 获取按优先级排序的动画队列
   */
  getSortedAnimations(): Animation[] {
    const active = Array.from(this.animations.values())
      .filter(a => !a.isComplete);

    return active.sort((a, b) => {
      const priorityDiff = PRIORITY_MAP[b.priority] - PRIORITY_MAP[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 相同优先级，先注册的先执行
      return a.startTime - b.startTime;
    });
  }

  /**
   * 清理已完成的动画
   */
  cleanup(): string[] {
    const cleaned: string[] = [];

    for (const id of this.completedIds) {
      this.animations.delete(id);
      cleaned.push(id);
    }

    this.completedIds.clear();
    return cleaned;
  }

  /**
   * 获取动画数据
   */
  getAnimation(id: string): Animation | undefined {
    return this.animations.get(id);
  }

  /**
   * 手动完成动画
   */
  completeAnimation(id: string): void {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isComplete = true;
      this.completedIds.add(id);
    }
  }

  /**
   * 分配帧预算（返回可用时间，单位ms）
   */
  allocateFrameBudget(): number {
    const now = performance.now();
    const elapsed = now - this.frameStartTime;
    const remaining = Math.max(0, FRAME_BUDGET - elapsed);
    
    return remaining;
  }

  /**
   * 检查是否有足够的帧预算
   */
  hasFrameBudget(requiredMs: number = 1): boolean {
    return this.allocateFrameBudget() >= requiredMs;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const byType = {
      tear: 0,
      capture: 0,
      border: 0
    };

    const byPriority = {
      high: 0,
      medium: 0,
      low: 0
    };

    for (const animation of this.animations.values()) {
      if (!animation.isComplete) {
        byType[animation.type]++;
        byPriority[animation.priority]++;
      }
    }

    return {
      total: this.animations.size,
      active: this.animations.size - this.completedIds.size,
      completed: this.completedIds.size,
      byType,
      byPriority,
      frameBudgetRemaining: this.allocateFrameBudget()
    };
  }

  /**
   * 清空所有动画
   */
  clear(): void {
    this.animations.clear();
    this.completedIds.clear();
  }
}

// 单例导出
export const animationManager = new AnimationManager();

