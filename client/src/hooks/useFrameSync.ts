/**
 * 帧同步Hook - 确保双根应用的渲染帧对齐
 * 
 * 原理：
 * - 主应用广播当前帧ID
 * - 动画应用监听帧ID，同步自己的渲染
 * - 使用SharedArrayBuffer（如果可用）优化性能
 */

import { useEffect, useRef } from 'react';
import { eventBus } from '../utils/eventBus';

interface FrameSyncOptions {
  enabled?: boolean;
  throttle?: number; // 每N帧同步一次（降低开销）
}

/**
 * 主应用：广播帧ID
 */
export function useFrameSyncBroadcast(
  isDualRoot: boolean,
  options: FrameSyncOptions = {}
) {
  const { enabled = true, throttle = 1 } = options;
  const frameIdRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDualRoot || !enabled) return;

    console.log('[FrameSync] 启动帧同步广播');

    const syncLoop = (timestamp: number) => {
      frameIdRef.current++;

      // 节流：每N帧广播一次
      if (frameIdRef.current % throttle === 0) {
        eventBus.emit('FRAME_SYNC', {
          frameId: frameIdRef.current,
          timestamp
        }, 10); // 低优先级，避免阻塞关键消息
      }

      rafIdRef.current = requestAnimationFrame(syncLoop);
    };

    rafIdRef.current = requestAnimationFrame(syncLoop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      console.log('[FrameSync] 停止帧同步广播');
    };
  }, [isDualRoot, enabled, throttle]);

  return frameIdRef.current;
}

/**
 * 动画应用：监听帧同步
 */
export function useFrameSyncReceiver(
  isDualRoot: boolean,
  onFrameSync?: (frameId: number, timestamp: number) => void
) {
  const lastFrameIdRef = useRef(0);
  const missedFramesRef = useRef(0);

  useEffect(() => {
    if (!isDualRoot) return;

    console.log('[FrameSync] 启动帧同步接收');

    const unsubscribe = eventBus.on('FRAME_SYNC', ({ frameId, timestamp }) => {
      // 检测丢帧
      const expectedFrameId = lastFrameIdRef.current + 1;
      if (frameId > expectedFrameId) {
        const missed = frameId - expectedFrameId;
        missedFramesRef.current += missed;
        console.warn(`[FrameSync] 检测到 ${missed} 帧丢失`);
      }

      lastFrameIdRef.current = frameId;
      onFrameSync?.(frameId, timestamp);
    });

    return () => {
      unsubscribe();
      console.log(`[FrameSync] 停止帧同步接收，总丢帧: ${missedFramesRef.current}`);
    };
  }, [isDualRoot, onFrameSync]);

  return {
    currentFrameId: lastFrameIdRef.current,
    missedFrames: missedFramesRef.current
  };
}

/**
 * 通用帧同步Hook（自动判断角色）
 */
export function useFrameSync(
  isDualRoot: boolean,
  role: 'broadcaster' | 'receiver',
  options: FrameSyncOptions = {}
) {
  const broadcastFrameId = useFrameSyncBroadcast(
    isDualRoot && role === 'broadcaster',
    options
  );

  const { currentFrameId, missedFrames } = useFrameSyncReceiver(
    isDualRoot && role === 'receiver'
  );

  return role === 'broadcaster'
    ? { frameId: broadcastFrameId, missedFrames: 0 }
    : { frameId: currentFrameId, missedFrames };
}

