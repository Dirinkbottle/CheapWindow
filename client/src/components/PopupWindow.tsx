/**
 * 弹窗组件
 * 支持拖动、抛投、抢夺、撕裂等交互
 */
import React, { useRef, useState, useEffect, CSSProperties } from 'react';
import type { WindowData, ContestedData, Point, Settings } from '../types';
import {
  percentPointToPixel,
  pixelPointToPercent,
  calculatePercentVelocity
} from '../utils/coordinates';
import { TearEffect } from './TearEffect';

interface PopupWindowProps {
  window: WindowData;
  contestData?: ContestedData;
  userVectors?: Map<string, { position: Point; force: number }>;
  settings?: Settings | null;
  onGrab: (windowId: string) => void;
  onDrag: (windowId: string, position: Point, force?: number) => void;
  onRelease: (windowId: string, velocity: Point) => void;
}

export const PopupWindow: React.FC<PopupWindowProps> = ({
  window,
  contestData,
  userVectors,
  settings,
  onGrab,
  onDrag,
  onRelease
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTearing, setIsTearing] = useState(false);
  const [showTearEffect, setShowTearEffect] = useState(false);
  const [localPosition, setLocalPosition] = useState<Point | null>(null);
  const dragStartRef = useRef<{ position: Point; time: number } | null>(null);
  const lastPositionRef = useRef<Point>({ x: 0, y: 0 });
  const dragHistoryRef = useRef<Array<{ position: Point; time: number }>>([]);

  // 获取屏幕尺寸
  const screenWidth = globalThis.innerWidth;
  const screenHeight = globalThis.innerHeight;

  // 位置优先级：多人抢夺时优先使用服务器位置，单人拖动时使用本地位置
  const isBeingContested = contestData && contestData.userCount > 1;
  const shouldUseLocalPosition = isDragging && localPosition && !isBeingContested;
  const currentPosition = shouldUseLocalPosition ? localPosition : window.position;
  
  // 转换百分比坐标为像素
  const pixelPosition = percentPointToPixel(
    currentPosition,
    screenWidth,
    screenHeight
  );

  // 处理鼠标/触摸按下
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    onGrab(window.id);

    const clientX = e.clientX;
    const clientY = e.clientY;

    dragStartRef.current = {
      position: { x: clientX, y: clientY },
      time: Date.now()
    };

    lastPositionRef.current = { x: clientX, y: clientY };
    dragHistoryRef.current = [
      { position: { x: clientX, y: clientY }, time: Date.now() }
    ];

    // 捕获指针
    if (windowRef.current) {
      windowRef.current.setPointerCapture(e.pointerId);
    }
  };

  // 处理拖动
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.clientX;
    const clientY = e.clientY;
    const now = Date.now();

    // 转换为百分比坐标
    const percentPos = pixelPointToPercent(
      { x: clientX, y: clientY },
      screenWidth,
      screenHeight
    );

    // 计算拖动力量（基于速度）
    let force = 1.0;
    if (dragHistoryRef.current.length > 0) {
      const lastDrag = dragHistoryRef.current[dragHistoryRef.current.length - 1];
      const dt = (now - lastDrag.time) / 1000;
      if (dt > 0 && dt < 0.1) { // 只在合理时间内计算
        const dx = clientX - lastDrag.position.x;
        const dy = clientY - lastDrag.position.y;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt; // 像素/秒
        // 将速度映射到力量：0-1000像素/秒 映射到 0.5-2.0 力量
        force = 0.5 + Math.min(speed / 1000, 1.5);
      }
    }

    // 只在单人拖动时使用本地位置；多人抢夺时由服务器计算
    const isContested = window.grabbedBy && window.grabbedBy.length > 1;
    if (!isContested) {
      setLocalPosition(percentPos);
    }
    
    // 发送拖动事件到服务器，包含力量信息
    onDrag(window.id, percentPos, force);

    // 记录拖动历史（用于计算速度）
    dragHistoryRef.current.push({
      position: { x: clientX, y: clientY },
      time: now
    });

    // 只保留最近200ms的历史
    dragHistoryRef.current = dragHistoryRef.current.filter(
      h => now - h.time < 200
    );

    lastPositionRef.current = { x: clientX, y: clientY };
  };

  // 处理释放
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    setIsDragging(false);
    setLocalPosition(null); // 清除本地位置，恢复使用服务器位置

    // 计算抛投速度
    let velocity: Point = { x: 0, y: 0 };

    if (dragHistoryRef.current.length >= 2) {
      // 使用最近的历史计算速度
      const recent = dragHistoryRef.current.slice(-5);
      const start = recent[0];
      const end = recent[recent.length - 1];
      const deltaTime = (end.time - start.time) / 1000; // 转换为秒

      if (deltaTime > 0) {
        velocity = calculatePercentVelocity(
          start.position,
          end.position,
          deltaTime,
          screenWidth,
          screenHeight
        );

        // 限制最大速度
        const maxVelocity = 200; // %/秒
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        if (speed > maxVelocity) {
          const scale = maxVelocity / speed;
          velocity.x *= scale;
          velocity.y *= scale;
        }
      }
    }

    onRelease(window.id, velocity);

    // 清理
    dragStartRef.current = null;
    dragHistoryRef.current = [];

    // 释放指针捕获
    if (windowRef.current) {
      windowRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // 监听撕裂动画 - 当收到 userVectors 时触发（只触发一次）
  useEffect(() => {
    if (userVectors && userVectors.size > 0 && !showTearEffect) {
      console.log('🎬 [撕裂动画] 开始播放撕裂动画', window.id);
      setIsTearing(true);
      setShowTearEffect(true);
    }
    // 只依赖 userVectors 和 window.id，避免 showTearEffect 导致重复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userVectors, window.id]);

  // 检测设备类型和性能配置
  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
  const useGPUAcceleration = settings?.enable_gpu_acceleration === '1';
  const disableFloatOnMobile = settings?.disable_float_animation_mobile === '1';
  
  // 添加动画类和计算样式
  let animationClass = '';
  const cssVariables: Record<string, string> = {
    '--float-x': `${window.floatAnimation.offsetX}px`,
    '--float-y': `${window.floatAnimation.offsetY}px`,
    '--float-duration': `${window.floatAnimation.duration}s`,
  };

  if (isTearing) {
    animationClass = 'tear-animation';
  } else if (contestData && contestData.userCount > 1) {
    // 只有多人抢夺时才显示抖动动画
    animationClass = 'shake-animation';
    cssVariables['--shake-intensity'] = `${contestData.shakeIntensity}px`;
  } else if (!isDragging && !window.isDragging) {
    // 移动端根据配置决定是否禁用浮动动画
    const shouldFloat = !(isMobile && disableFloatOnMobile);
    if (shouldFloat) {
      animationClass = 'float-animation';
    }
  }

  // 根据 GPU 加速配置决定定位方式
  const style: CSSProperties = useGPUAcceleration ? {
    // GPU 加速模式：使用 transform3d
    position: 'fixed',
    left: `${pixelPosition.x}px`,
    top: `${pixelPosition.y}px`,
    width: `${window.size.width}px`,
    height: `${window.size.height}px`,
    backgroundColor: window.colors.bg,
    color: window.colors.text,
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '15px',
    textAlign: 'center',
    fontSize: `${window.fontSize}px`,
    fontFamily: 'Microsoft YaHei, sans-serif',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: isDragging ? 1000 : 100,
    transform: `translate3d(-50%, -50%, 0)`,
    transition: isDragging ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out',
    willChange: 'transform',
    ...cssVariables
  } : {
    // 传统模式：使用 left/top
    position: 'fixed',
    left: `${pixelPosition.x}px`,
    top: `${pixelPosition.y}px`,
    width: `${window.size.width}px`,
    height: `${window.size.height}px`,
    backgroundColor: window.colors.bg,
    color: window.colors.text,
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '15px',
    textAlign: 'center',
    fontSize: `${window.fontSize}px`,
    fontFamily: 'Microsoft YaHei, sans-serif',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: isDragging ? 1000 : 100,
    transition: isDragging ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out',
    transform: 'translate(-50%, -50%)',
    ...cssVariables
  };

  return (
    <>
      {/* 显示撕裂动画或正常窗口 */}
      {showTearEffect && userVectors && userVectors.size > 0 && settings ? (
        <TearEffect
          window={window}
          contestData={contestData || {
            windowId: window.id,
            userCount: userVectors.size,
            timeLeft: 0,
            shakeIntensity: userVectors.size * 2,
            progress: 1
          }}
          userVectors={userVectors}
          pixelPosition={pixelPosition}
          settings={settings}
          onComplete={() => {
            if (settings?.enable_debug_logs === '1') {
              console.log('🎬 [撕裂动画] 动画完成', window.id);
            }
            setShowTearEffect(false);
            // 动画完成后窗口会被服务器移除
          }}
        />
      ) : (
        <div
          ref={windowRef}
          className={`popup-window ${animationClass}`}
          style={{
            ...style,
            opacity: isTearing ? 0 : 1,
            display: isTearing ? 'none' : 'flex'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="popup-content">
            {window.message}
          </div>
          
          {/* 抢夺指示器 - 根据配置显示 */}
          {settings?.show_contest_indicator === '1' && isBeingContested && contestData && (
            <div className="contest-indicator">
              {contestData.userCount} 人抢夺中 - {Math.ceil(contestData.timeLeft / 1000)}s
            </div>
          )}
        </div>
      )}

      {/* CSS样式 */}
      <style>{`
        .popup-window {
          box-sizing: border-box;
        }

        .popup-content {
          font-weight: 500;
          line-height: 1.4;
        }

        /* 正常浮动动画 */
        .float-animation {
          animation: float var(--float-duration) ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { 
            transform: translate(-50%, -50%) translate(0, 0); 
          }
          25% { 
            transform: translate(-50%, -50%) translate(var(--float-x), var(--float-y)); 
          }
          50% { 
            transform: translate(-50%, -50%) translate(calc(var(--float-x) * -1), var(--float-y)); 
          }
          75% { 
            transform: translate(-50%, -50%) translate(var(--float-x), calc(var(--float-y) * -1)); 
          }
        }

        /* 抖动动画（被抢夺） */
        .shake-animation {
          animation: shake 0.1s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { 
            transform: translate(-50%, -50%) translate(0, 0); 
          }
          10% { 
            transform: translate(-50%, -50%) translate(var(--shake-intensity), calc(var(--shake-intensity) * -0.5)); 
          }
          20% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * -1), var(--shake-intensity)); 
          }
          30% { 
            transform: translate(-50%, -50%) translate(var(--shake-intensity), var(--shake-intensity)); 
          }
          40% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * -0.8), calc(var(--shake-intensity) * -0.8)); 
          }
          50% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * 0.8), calc(var(--shake-intensity) * -1)); 
          }
          60% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * -1), calc(var(--shake-intensity) * 0.5)); 
          }
          70% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * 0.5), var(--shake-intensity)); 
          }
          80% { 
            transform: translate(-50%, -50%) translate(calc(var(--shake-intensity) * -0.5), calc(var(--shake-intensity) * -0.7)); 
          }
          90% { 
            transform: translate(-50%, -50%) translate(var(--shake-intensity), calc(var(--shake-intensity) * 0.3)); 
          }
        }

        /* 撕裂动画 */
        .tear-animation {
          animation: tear 0.8s ease-out forwards;
        }

        @keyframes tear {
          0% { 
            transform: translate(-50%, -50%) scale(1) rotate(0deg); 
            opacity: 1; 
            filter: blur(0px);
          }
          30% { 
            transform: translate(-50%, -50%) scale(1.15) rotate(5deg); 
            filter: blur(1px);
          }
          60% { 
            transform: translate(-50%, -50%) scale(1.25) rotate(-8deg); 
            opacity: 0.8;
            filter: blur(3px);
          }
          100% { 
            transform: translate(-50%, -50%) scale(0.3) rotate(25deg); 
            opacity: 0; 
            filter: blur(8px);
          }
        }

        /* 抢夺指示器 */
        .contest-indicator {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 87, 34, 0.95);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
          pointer-events: none;
          z-index: 10;
          animation: contest-pulse 0.5s ease-in-out infinite;
        }

        @keyframes contest-pulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1); 
          }
          50% { 
            transform: translateX(-50%) scale(1.05); 
          }
        }
      `}</style>
    </>
  );
};

