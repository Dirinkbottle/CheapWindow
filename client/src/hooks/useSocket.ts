/**
 * Socket.IO Hook
 * 管理WebSocket连接和事件
 */
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WindowData, PhysicsUpdate, ContestedData, Point } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  windows: Map<string, WindowData>;
  contestedWindows: Map<string, ContestedData>;
  grabWindow: (windowId: string) => void;
  dragWindow: (windowId: string, position: Point) => void;
  releaseWindow: (windowId: string, velocity: Point) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [windows, setWindows] = useState<Map<string, WindowData>>(new Map());
  const [contestedWindows, setContestedWindows] = useState<Map<string, ContestedData>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 创建Socket连接
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // 连接成功
    socket.on('connect', () => {
      console.log('✓ WebSocket已连接:', socket.id);
      setConnected(true);
    });

    // 连接断开
    socket.on('disconnect', () => {
      console.log('✗ WebSocket已断开');
      setConnected(false);
    });

    // 全量同步窗口
    socket.on('sync_windows', (windowsArray: WindowData[]) => {
      console.log(`[同步] 收到 ${windowsArray.length} 个窗口`);
      const newWindows = new Map<string, WindowData>();
      windowsArray.forEach(w => newWindows.set(w.id, w));
      setWindows(newWindows);
    });

    // 新窗口创建
    socket.on('window_created', (windowData: WindowData) => {
      console.log('[新窗口]', windowData.message);
      setWindows(prev => {
        const newMap = new Map(prev);
        newMap.set(windowData.id, windowData);
        return newMap;
      });
    });

    // 物理状态更新（60fps）
    socket.on('physics_update', (updates: PhysicsUpdate[]) => {
      if (updates.length === 0) return;
      
      setWindows(prev => {
        const newMap = new Map(prev);
        updates.forEach(update => {
          const window = newMap.get(update.id);
          if (window) {
            window.position = update.position;
            window.velocity = update.velocity;
          }
        });
        return newMap;
      });
    });

    // 窗口被抓取
    socket.on('window_grabbed', ({ windowId, userIds }: { windowId: string; userIds: string[] }) => {
      setWindows(prev => {
        const newMap = new Map(prev);
        const window = newMap.get(windowId);
        if (window) {
          window.grabbedBy = userIds;
          window.isDragging = userIds.length > 0;
        }
        return newMap;
      });
    });

    // 窗口被拖动（其他用户）
    socket.on('window_dragged', ({ windowId, position }: { windowId: string; position: Point }) => {
      setWindows(prev => {
        const newMap = new Map(prev);
        const window = newMap.get(windowId);
        if (window) {
          window.position = position;
        }
        return newMap;
      });
    });

    // 窗口被释放
    socket.on('window_released', ({ windowId, userIds }: { windowId: string; userIds: string[] }) => {
      setWindows(prev => {
        const newMap = new Map(prev);
        const window = newMap.get(windowId);
        if (window) {
          window.grabbedBy = userIds;
          window.isDragging = userIds.length > 0;
        }
        return newMap;
      });
    });

    // 窗口抢夺状态
    socket.on('window_contested', (contestData: ContestedData) => {
      setContestedWindows(prev => {
        const newMap = new Map(prev);
        newMap.set(contestData.windowId, contestData);
        return newMap;
      });

      // 同时更新窗口状态
      setWindows(prev => {
        const newMap = new Map(prev);
        const window = newMap.get(contestData.windowId);
        if (window) {
          window.isContested = true;
        }
        return newMap;
      });
    });

    // 窗口撕裂
    socket.on('window_torn', (windowId: string) => {
      console.log('[窗口撕裂]', windowId);
      setWindows(prev => {
        const newMap = new Map(prev);
        newMap.delete(windowId);
        return newMap;
      });
      setContestedWindows(prev => {
        const newMap = new Map(prev);
        newMap.delete(windowId);
        return newMap;
      });
    });

    // 清理
    return () => {
      socket.disconnect();
    };
  }, []);

  // 发送事件的辅助函数
  const grabWindow = (windowId: string) => {
    socketRef.current?.emit('grab_window', windowId);
  };

  const dragWindow = (windowId: string, position: Point) => {
    socketRef.current?.emit('drag_window', { windowId, position });
  };

  const releaseWindow = (windowId: string, velocity: Point) => {
    socketRef.current?.emit('release_window', { windowId, velocity });
  };

  return {
    socket: socketRef.current,
    connected,
    windows,
    contestedWindows,
    grabWindow,
    dragWindow,
    releaseWindow
  };
};

