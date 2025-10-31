/**
 * 性能监控模块
 * 用于监控和记录系统性能指标
 */

export class PerformanceMonitor {
  constructor(config = {}) {
    this.metrics = {
      dbWrites: [],
      wallChecks: [],
      captures: [],
      releases: [],
      assignments: []
    };
    
    this.enabled = config.enabled !== false;
    this.threshold = config.threshold || 50; // 默认50ms阈值
    this.maxSamples = config.maxSamples || 100; // 保留最近100个样本
  }

  /**
   * 启动计时器
   */
  startTimer(category) {
    if (!this.enabled) {
      return { end: () => 0 };
    }

    const start = Date.now();
    return {
      category,
      start,
      end: () => {
        const duration = Date.now() - start;
        this.recordMetric(category, duration);
        return duration;
      }
    };
  }

  /**
   * 记录指标
   */
  recordMetric(category, duration) {
    if (!this.enabled) return;
    
    if (!this.metrics[category]) {
      this.metrics[category] = [];
    }
    
    this.metrics[category].push({
      duration,
      timestamp: Date.now()
    });
    
    // 保持样本数量限制
    if (this.metrics[category].length > this.maxSamples) {
      this.metrics[category].shift();
    }
    
    // 如果超过阈值，记录警告
    if (duration > this.threshold) {
      console.warn(`⚠️ [性能警告] ${category} 耗时: ${duration}ms (阈值: ${this.threshold}ms)`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const stats = {};
    
    for (const [category, samples] of Object.entries(this.metrics)) {
      if (samples.length === 0) continue;
      
      const durations = samples.map(s => s.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      const p95 = this.calculatePercentile(durations, 0.95);
      const p99 = this.calculatePercentile(durations, 0.99);
      
      stats[category] = {
        avg: Math.round(avg * 100) / 100,
        max,
        min,
        p95,
        p99,
        count: samples.length,
        overThreshold: durations.filter(d => d > this.threshold).length
      };
    }
    
    return stats;
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 重置所有指标
   */
  reset() {
    for (const category in this.metrics) {
      this.metrics[category] = [];
    }
    console.log('✓ 性能监控指标已重置');
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`✓ 性能监控已${enabled ? '启用' : '禁用'}`);
  }

  /**
   * 设置阈值
   */
  setThreshold(threshold) {
    this.threshold = threshold;
    console.log(`✓ 性能警告阈值设置为: ${threshold}ms`);
  }

  /**
   * 获取监控状态
   */
  getStatus() {
    return {
      enabled: this.enabled,
      threshold: this.threshold,
      maxSamples: this.maxSamples,
      categories: Object.keys(this.metrics),
      totalSamples: Object.values(this.metrics).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}

// 导出单例实例
export const perfMonitor = new PerformanceMonitor();

