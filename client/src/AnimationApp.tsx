/**
 * 动画应用 - 仅在双根模式下使用
 * 负责：撕裂动画、墙壁捕获动画、窗口清理、墙壁边框
 * 
 * Phase 2 增强：
 * - WebGL渲染引擎（优先）
 * - Worker动画计算
 * - AnimationManager统一管理
 * - 帧同步
 */
import { useState, useEffect } from 'react';
import { TearEffect } from './components/TearEffect';
import { TearEffectWebGL } from './components/TearEffectWebGL';
import { WallCaptureAnimation } from './components/WallCaptureAnimation';
import { WallBorders } from './components/WallBorders';
import { eventBus } from './utils/eventBus';
import { animationManager } from './utils/AnimationManager';
import { useFrameSyncReceiver } from './hooks/useFrameSync';
import type { WindowData, Point, Settings, WallState, CapturedWindow } from './types';

interface AnimationAppProps {
  socketUrl?: string;
}

export const AnimationApp: React.FC<AnimationAppProps> = ({ socketUrl }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [wallState, setWallState] = useState<WallState>({ 
    top: null, 
    right: null, 
    bottom: null, 
    left: null 
  });
  const [capturedWindows, setCapturedWindows] = useState<Map<string, CapturedWindow>>(new Map());
  const [userVectorsMap, setUserVectorsMap] = useState<Map<string, Map<string, { position: Point; force: number }>>>(new Map());
  const [tornWindows, setTornWindows] = useState<Map<string, WindowData>>(new Map());
  
  // Phase 2: 帧同步
  useFrameSyncReceiver(
    true, // 始终在双根模式
    (_frameId, timestamp) => {
      // 每帧更新AnimationManager
      animationManager.updateAll(timestamp);
    }
  );
  
  // Phase 2: 启用EventBus可靠模式
  useEffect(() => {
    if (settings?.enable_reliable_events === '1') {
      eventBus.setReliableMode(true);
      console.log('[AnimationApp] EventBus可靠模式已启用');
    }
  }, [settings]);

  // 加载配置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const url = socketUrl || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
        const response = await fetch(`${url}/api/settings`);
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
          console.log('✅ [AnimationApp] 配置已加载');
        }
      } catch (error) {
        console.error('❌ [AnimationApp] 加载配置失败:', error);
      }
    };

    loadSettings();
  }, [socketUrl]);

  // 监听事件总线
  useEffect(() => {
    // 监听窗口撕裂事件
    const unsubscribeTorn = eventBus.on('WINDOW_TORN', ({ windowId, window, userVectors }) => {
      console.log('[AnimationApp] 收到窗口撕裂事件:', windowId);
      
      // 保存窗口数据
      if (window) {
        setTornWindows(prev => {
          const newMap = new Map(prev);
          newMap.set(windowId, window);
          return newMap;
        });
      }
      
      // 保存用户向量
      if (userVectors && userVectors.length > 0) {
        const vectorMap = new Map<string, { position: Point; force: number }>();
        userVectors.forEach((v: any) => vectorMap.set(v.userId, { 
          position: v.position, 
          force: v.force 
        }));
        
        setUserVectorsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(windowId, vectorMap);
          return newMap;
        });
      }
    });

    // 监听窗口捕获事件
    const unsubscribeCaptured = eventBus.on('WINDOW_CAPTURED', ({ windowId, window, edge }) => {
      console.log('[AnimationApp] 收到窗口捕获事件:', windowId, edge);
      
      setCapturedWindows(prev => {
        const newMap = new Map(prev);
        newMap.set(windowId, { windowId, window, edge });
        return newMap;
      });
    });

    // 监听墙壁状态更新
    const unsubscribeWall = eventBus.on('WALL_STATE_UPDATED', (newWallState: WallState) => {
      console.log('[AnimationApp] 收到墙壁状态更新');
      setWallState(newWallState);
    });

    // 监听配置更新
    const unsubscribeSettings = eventBus.on('SETTINGS_UPDATED', (newSettings: Settings) => {
      console.log('[AnimationApp] 收到配置更新');
      setSettings(newSettings);
    });

    return () => {
      unsubscribeTorn();
      unsubscribeCaptured();
      unsubscribeWall();
      unsubscribeSettings();
    };
  }, []);

  // 定期清理超时的捕获窗口
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = settings?.captured_window_cleanup_timeout 
        ? parseInt(settings.captured_window_cleanup_timeout) 
        : 10000;
      
      setCapturedWindows(prev => {
        const toDelete: string[] = [];
        
        for (const [windowId, captured] of prev.entries()) {
          if (captured.window.timestamp && now - captured.window.timestamp > timeout) {
            toDelete.push(windowId);
          }
        }
        
        if (toDelete.length === 0) return prev;
        
        const newMap = new Map(prev);
        toDelete.forEach(windowId => {
          newMap.delete(windowId);
          console.warn(`🧹 [AnimationApp 超时清理] 捕获窗口 ${windowId.slice(0, 8)} 超过 ${timeout}ms，强制清理`);
        });
        
        return newMap;
      });
    }, 2000); // 每2秒检查一次

    return () => clearInterval(cleanupInterval);
  }, [settings]);

  // 清理撕裂动画的用户向量和窗口数据
  const handleTearComplete = (windowId: string) => {
    console.log(`✅ [AnimationApp] 撕裂动画完成: ${windowId.slice(0, 8)}`);
    
    // 清理用户向量
    setUserVectorsMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(windowId);
      return newMap;
    });
    
    // 清理窗口数据
    setTornWindows(prev => {
      const newMap = new Map(prev);
      newMap.delete(windowId);
      return newMap;
    });
  };

  // 清理捕获动画的窗口数据
  const handleCaptureComplete = (windowId: string) => {
    console.log(`✅ [AnimationApp] 捕获动画完成: ${windowId.slice(0, 8)}`);
    setCapturedWindows(prev => {
      const newMap = new Map(prev);
      newMap.delete(windowId);
      return newMap;
    });
  };

  return (
    <div className="animation-app" style={{ 
      position: 'fixed', 
      inset: 0, 
      pointerEvents: 'none',
      zIndex: 5000 
    }}>
      {/* 墙壁边框 */}
      {settings?.enable_wall_system === '1' && (
        <WallBorders
          wallState={wallState}
          settings={settings}
          windowPositions={[]} // 动画应用不需要窗口位置
        />
      )}

      {/* 渲染捕获动画 */}
      {Array.from(capturedWindows.values()).map(captured => (
        <WallCaptureAnimation
          key={captured.windowId}
          window={captured.window}
          edge={captured.edge}
          settings={settings}
          onComplete={() => handleCaptureComplete(captured.windowId)}
        />
      ))}

      {/* 渲染撕裂动画 - WebGL优先，Canvas备选 */}
      {Array.from(tornWindows.entries()).map(([windowId, window]) => {
        const userVectors = userVectorsMap.get(windowId);
        if (!userVectors || userVectors.size === 0) return null;
        
        if (!settings) return null;
        
        // Phase 2: 根据配置选择渲染引擎
        const useWebGL = settings.enable_webgl_rendering === '1';
        
        if (useWebGL) {
          // WebGL渲染（GPU加速）
          return (
            <TearEffectWebGL
              key={windowId}
              window={window}
              userVectors={userVectors}
              settings={settings}
              onComplete={() => handleTearComplete(windowId)}
            />
          );
        } else {
          // Canvas渲染（兼容性优先）
          const pixelPosition = {
            x: (window.position.x / 100) * globalThis.innerWidth,
            y: (window.position.y / 100) * globalThis.innerHeight
          };
          
          return (
            <TearEffect
              key={windowId}
              window={window}
              contestData={{
                windowId,
                userCount: userVectors.size,
                timeLeft: 0,
                shakeIntensity: userVectors.size * 2,
                progress: 1
              }}
              userVectors={userVectors}
              pixelPosition={pixelPosition}
              settings={settings}
              onComplete={() => handleTearComplete(windowId)}
            />
          );
        }
      })}

      <style>{`
        .animation-app {
          /* 确保不干扰用户交互 */
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </div>
  );
};

