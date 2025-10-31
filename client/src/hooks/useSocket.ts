/**
 * Socket.IO Hook
 * 管理WebSocket连接和事件
 */
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { WindowData, PhysicsUpdate, ContestedData, Point, Settings, WallState, CapturedWindow } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  windows: Map<string, WindowData>;
  contestedWindows: Map<string, ContestedData>;
  userVectorsMap: Map<string, Map<string, { position: Point; force: number }>>;
  settings: Settings | null;
  wallState: WallState;
  capturedWindows: Map<string, CapturedWindow>;
  setCapturedWindows: React.Dispatch<React.SetStateAction<Map<string, CapturedWindow>>>;
  grabWindow: (windowId: string) => void;
  dragWindow: (windowId: string, position: Point, force?: number) => void;
  releaseWindow: (windowId: string, velocity: Point) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [windows, setWindows] = useState<Map<string, WindowData>>(new Map());
  const [contestedWindows, setContestedWindows] = useState<Map<string, ContestedData>>(new Map());
  const [userVectorsMap, setUserVectorsMap] = useState<Map<string, Map<string, { position: Point; force: number }>>>(new Map());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallState, setWallState] = useState<WallState>({ top: null, right: null, bottom: null, left: null });
  const [capturedWindows, setCapturedWindows] = useState<Map<string, CapturedWindow>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const mySocketIdRef = useRef<string | null>(null);
  const updateBufferRef = useRef<PhysicsUpdate[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (settings?.enable_debug_logs !== '0') {
      console.log('========================================');
      console.log('🔧 [Socket调试] 初始化WebSocket连接');
      console.log('🔧 [Socket调试] 服务器地址:', SOCKET_URL);
      console.log('🔧 [Socket调试] 当前时间:', new Date().toLocaleString());
      console.log('========================================');
    }

    // 创建Socket连接
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // 连接成功
    socket.on('connect', async () => {
      console.log('✅ [连接成功] WebSocket已连接');
      console.log('   📌 Socket ID:', socket.id);
      console.log('   📌 传输方式:', socket.io.engine.transport.name);
      console.log('   📌 服务器地址:', SOCKET_URL);
      mySocketIdRef.current = socket.id ?? null;
      setConnected(true);
      
      // 获取系统配置
      try {
        const response = await fetch(`${SOCKET_URL}/api/settings`);
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
          console.log('✅ [配置加载] 系统配置已加载');
        }
      } catch (error) {
        console.error('❌ [配置加载] 加载配置失败:', error);
      }
    });

    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('❌ [连接错误] WebSocket连接失败');
      console.error('   📌 错误信息:', error.message);
      console.error('   📌 错误类型:', error.name);
      console.error('   📌 服务器地址:', SOCKET_URL);
      console.error('   💡 请检查:');
      console.error('      1. 后端服务是否启动 (pm2 status)');
      console.error('      2. 端口3001是否被占用');
      console.error('      3. 防火墙是否阻止连接');
      console.error('      4. VITE_SOCKET_URL环境变量是否正确');
    });

    // 连接断开
    socket.on('disconnect', (reason) => {
      console.warn('⚠️ [连接断开] WebSocket已断开');
      console.warn('   📌 断开原因:', reason);
      console.warn('   📌 Socket ID:', socket.id);
      setConnected(false);
    });

    // 重连尝试
    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [重连尝试] 第 ${attempt} 次尝试重连...`);
    });

    // 重连失败
    socket.io.on('reconnect_failed', () => {
      console.error('❌ [重连失败] 达到最大重连次数，放弃重连');
      console.error('   💡 建议: 刷新页面或检查服务器状态');
    });

    // 重连成功
    socket.io.on('reconnect', (attempt) => {
      console.log(`✅ [重连成功] 第 ${attempt} 次尝试后重连成功`);
    });

    // 全量同步窗口
    socket.on('sync_windows', (windowsArray: WindowData[]) => {
      console.log(`📦 [数据同步] 收到 ${windowsArray.length} 个窗口`);
      console.log('   📌 窗口列表:', windowsArray.map(w => ({ id: w.id.slice(0, 8), message: w.message })));
      const newWindows = new Map<string, WindowData>();
      windowsArray.forEach(w => newWindows.set(w.id, w));
      setWindows(newWindows);
    });

    // 新窗口创建
    socket.on('window_created', (windowData: WindowData) => {
      console.log(`🆕 [新窗口] ${windowData.message}`);
      console.log('   📌 窗口ID:', windowData.id.slice(0, 8));
      console.log('   📌 位置:', windowData.position);
      setWindows(prev => {
        const newMap = new Map(prev);
        newMap.set(windowData.id, windowData);
        return newMap;
      });
    });

    // 批量更新处理函数
    const applyBatchUpdates = () => {
      if (updateBufferRef.current.length === 0) {
        rafIdRef.current = null;
        return;
      }
      
      const updates = [...updateBufferRef.current];
      updateBufferRef.current = [];
      
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
      
      rafIdRef.current = null;
    };

    // 物理状态更新（60fps）
    socket.on('physics_update', (updates: PhysicsUpdate[]) => {
      if (updates.length === 0) return;
      
      // 检查是否启用批量渲染
      const useBatchRendering = settings?.enable_batch_rendering === '1';
      
      if (useBatchRendering) {
        // 批量模式：缓存更新，使用 requestAnimationFrame 合并
        updateBufferRef.current.push(...updates);
        
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(applyBatchUpdates);
        }
      } else {
        // 传统模式：立即更新
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
      }
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
      
      // 如果只剩1人或没人抓取，清除抢夺状态
      if (userIds.length <= 1) {
        setContestedWindows(prev => {
          const newMap = new Map(prev);
          newMap.delete(windowId);
          return newMap;
        });
      }
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
    socket.on('window_torn', ({ windowId, userVectors }: { windowId: string; userVectors: Array<{ userId: string; position: Point; force: number }> }) => {
      console.log('[窗口撕裂]', windowId, '用户向量:', userVectors);
      
      // 存储用户向量用于撕裂动画
      if (userVectors && userVectors.length > 0) {
        setUserVectorsMap(prev => {
          const newMap = new Map(prev);
          const vectorMap = new Map<string, { position: Point; force: number }>();
          userVectors.forEach(v => vectorMap.set(v.userId, { position: v.position, force: v.force }));
          newMap.set(windowId, vectorMap);
          return newMap;
        });
        
        // 延迟删除窗口，让撕裂动画播放（使用配置的时长 + 100ms 缓冲）
        const animationDuration = settings?.tear_animation_duration 
          ? parseInt(settings.tear_animation_duration) 
          : 1500;
        setTimeout(() => {
          setWindows(prev => {
            const newMap = new Map(prev);
            newMap.delete(windowId);
            return newMap;
          });
          setUserVectorsMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(windowId);
            return newMap;
          });
        }, animationDuration + 100); // 动画时长 + 100ms 缓冲
      } else {
        // 没有向量数据，直接删除
        setWindows(prev => {
          const newMap = new Map(prev);
          newMap.delete(windowId);
          return newMap;
        });
      }
      
      setContestedWindows(prev => {
        const newMap = new Map(prev);
        newMap.delete(windowId);
        return newMap;
      });
    });

    // 墙壁状态更新
    socket.on('wall_state_updated', (newWallState: WallState) => {
      console.log('🧱 [墙壁状态] 墙壁状态已更新', newWallState);
      setWallState(newWallState);
    });

    // ✅ 墙壁状态定期同步（防止缓存不一致）
    socket.on('wall_state_sync', ({ walls, timestamp }: { walls: WallState; timestamp: number }) => {
      if (settings?.enable_debug_logs === '1') {
        console.log('🔄 [墙壁同步] 收到定期墙壁状态同步', { walls, timestamp });
      }
      setWallState(walls);
    });

    // 窗口被墙壁捕获（仅墙壁主人收到）
    socket.on('window_captured', ({ captureId, windowId, window, edge }: { captureId: string; windowId: string; window: WindowData; edge: string }) => {
      console.log(`🎯 [窗口捕获] 窗口 ${windowId.slice(0, 8)} 被 ${edge} 墙捕获`);
      console.log(`   📌 捕获ID: ${captureId}`);
      console.log(`   📌 窗口位置: (${window.position.x.toFixed(1)}%, ${window.position.y.toFixed(1)}%)`);
      
      // ✅ 立即发送确认，避免服务器超时回滚
      socket.emit('capture_confirmed', captureId);
      console.log(`   ✅ 已发送捕获确认: ${captureId}`);
      
      // ✅ 优化状态更新：使用批量更新避免双重显示
      setWindows(prev => {
        const newMap = new Map(prev);
        newMap.delete(windowId);
        return newMap;
      });
      
      // 添加到捕获窗口列表
      setCapturedWindows(prev => {
        const newMap = new Map(prev);
        newMap.set(windowId, { windowId, window, edge: edge as any });
        return newMap;
      });
    });

    // 窗口被移除（其他用户看到的）
    socket.on('window_removed', ({ windowId }: { windowId: string }) => {
      console.log(`🗑️ [窗口移除] 窗口 ${windowId.slice(0, 8)} 已移除`);
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

    // 调试: 监听所有事件
    socket.onAny((eventName, ...args) => {
      if (!['physics_update'].includes(eventName)) {
        console.log(`📨 [收到事件] ${eventName}`, args);
      }
    });

    // 清理
    return () => {
      console.log('🔌 [断开连接] 组件卸载，关闭WebSocket连接');
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      socket.disconnect();
    };
  }, []);

  // 发送事件的辅助函数
  const grabWindow = (windowId: string) => {
    socketRef.current?.emit('grab_window', windowId);
  };

  const dragWindow = (windowId: string, position: Point, force: number = 1.0) => {
    socketRef.current?.emit('drag_window', { windowId, position, force });
  };

  const releaseWindow = (windowId: string, velocity: Point) => {
    socketRef.current?.emit('release_window', { windowId, velocity });
  };

  return {
    socket: socketRef.current,
    connected,
    windows,
    contestedWindows,
    userVectorsMap,
    settings,
    wallState,
    capturedWindows,
    setCapturedWindows,
    grabWindow,
    dragWindow,
    releaseWindow
  };
};

