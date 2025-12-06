/**
 * Animation Worker Hook - 简化Worker通信
 * 
 * 功能：
 * - 自动创建和管理Worker生命周期
 * - Promise化的Worker通信
 * - 性能监控
 * - 自动降级（Worker不可用时）
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface WorkerMessage {
  type: string;
  requestId?: string;
  [key: string]: any;
}

interface WorkerPerformance {
  totalRequests: number;
  avgDuration: number;
  maxDuration: number;
  errors: number;
}

export function useAnimationWorker(enabled: boolean = true) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const pendingRequests = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }>>(new Map());
  
  const [performance, setPerformance] = useState<WorkerPerformance>({
    totalRequests: 0,
    avgDuration: 0,
    maxDuration: 0,
    errors: 0
  });

  // 初始化Worker
  useEffect(() => {
    if (!enabled) return;

    // 检查Worker支持
    if (typeof Worker === 'undefined') {
      console.warn('[AnimationWorker] Worker API not supported');
      setIsSupported(false);
      return;
    }

    try {
      // 创建Worker
      const worker = new Worker(
        new URL('../workers/animationWorker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current = worker;

      // 处理Worker消息
      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const { type, requestId } = e.data;

        if (type === 'WORKER_READY') {
          setIsReady(true);
          console.log('[AnimationWorker] Worker initialized');
          return;
        }

        if (requestId && pendingRequests.current.has(requestId)) {
          const request = pendingRequests.current.get(requestId)!;
          const duration = Date.now() - request.timestamp;

          // 更新性能统计
          setPerformance(prev => ({
            totalRequests: prev.totalRequests + 1,
            avgDuration: (prev.avgDuration * prev.totalRequests + duration) / (prev.totalRequests + 1),
            maxDuration: Math.max(prev.maxDuration, duration),
            errors: type === 'ERROR' ? prev.errors + 1 : prev.errors
          }));

          if (type === 'ERROR') {
            request.reject(new Error(e.data.error));
          } else {
            request.resolve(e.data);
          }

          pendingRequests.current.delete(requestId);
        }
      };

      worker.onerror = (error) => {
        console.error('[AnimationWorker] Worker error:', error);
        setPerformance(prev => ({ ...prev, errors: prev.errors + 1 }));
      };

      // 健康检查
      const healthCheck = setInterval(() => {
        if (workerRef.current) {
          sendMessage('PING', {});
        }
      }, 30000); // 每30秒检查一次

      return () => {
        clearInterval(healthCheck);
        worker.terminate();
        workerRef.current = null;
        setIsReady(false);
      };
    } catch (error) {
      console.error('[AnimationWorker] Failed to create worker:', error);
      setIsSupported(false);
    }
  }, [enabled]);

  /**
   * 发送消息到Worker并等待响应
   */
  const sendMessage = useCallback(
    <T = any>(type: string, data: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        pendingRequests.current.set(requestId, {
          resolve,
          reject,
          timestamp: Date.now()
        });

        // 设置超时（5秒）
        setTimeout(() => {
          if (pendingRequests.current.has(requestId)) {
            pendingRequests.current.delete(requestId);
            reject(new Error('Worker request timeout'));
          }
        }, 5000);

        workerRef.current!.postMessage({ type, data, requestId });
      });
    },
    [isReady]
  );

  /**
   * 计算撕裂碎片
   */
  const calculateTearFragments = useCallback(
    async (params: any) => {
      if (!isSupported || !enabled || !isReady) {
        // 降级：返回null，调用方使用主线程计算
        return null;
      }

      try {
        const result = await sendMessage('CALCULATE_TEAR_FRAGMENTS', params);
        return result.fragments;
      } catch (error) {
        console.error('[AnimationWorker] Calculate tear fragments failed:', error);
        return null;
      }
    },
    [isSupported, enabled, isReady, sendMessage]
  );

  /**
   * 物理模拟
   */
  const simulatePhysics = useCallback(
    async (fragments: any[], deltaTime: number, gravity: number = 200, airResistance: number = 0.1) => {
      if (!isSupported || !enabled || !isReady) {
        return null;
      }

      try {
        const result = await sendMessage('SIMULATE_PHYSICS', {
          fragments,
          deltaTime,
          gravity,
          airResistance
        });
        return result.fragments;
      } catch (error) {
        console.error('[AnimationWorker] Simulate physics failed:', error);
        return null;
      }
    },
    [isSupported, enabled, isReady, sendMessage]
  );

  /**
   * 批量计算
   */
  const batchCalculate = useCallback(
    async (requests: any[]) => {
      if (!isSupported || !enabled || !isReady) {
        return null;
      }

      try {
        const result = await sendMessage('BATCH_CALCULATE', { requests });
        return new Map(result.results);
      } catch (error) {
        console.error('[AnimationWorker] Batch calculate failed:', error);
        return null;
      }
    },
    [isSupported, enabled, isReady, sendMessage]
  );

  return {
    isReady: isReady && isSupported,
    isSupported,
    performance,
    calculateTearFragments,
    simulatePhysics,
    batchCalculate
  };
}

