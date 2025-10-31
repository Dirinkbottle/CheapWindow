/**
 * 弹窗组件
 * 支持拖动、抛投、抢夺、撕裂等交互
 */
import React, { useRef, useState, useEffect, CSSProperties } from 'react';
import type { WindowData, ContestedData, Point } from '../types';
import {
  percentPointToPixel,
  pixelPointToPercent,
  calculatePercentVelocity
} from '../utils/coordinates';

interface PopupWindowProps {
  window: WindowData;
  contestData?: ContestedData;
  onGrab: (windowId: string) => void;
  onDrag: (windowId: string, position: Point) => void;
  onRelease: (windowId: string, velocity: Point) => void;
}

export const PopupWindow: React.FC<PopupWindowProps> = ({
  window,
  contestData,
  onGrab,
  onDrag,
  onRelease
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTearing, setIsTearing] = useState(false);
  const dragStartRef = useRef<{ position: Point; time: number } | null>(null);
  const lastPositionRef = useRef<Point>({ x: 0, y: 0 });
  const dragHistoryRef = useRef<Array<{ position: Point; time: number }>>([]);

  // 获取屏幕尺寸
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // 转换百分比坐标为像素
  const pixelPosition = percentPointToPixel(
    window.position,
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

    // 转换为百分比坐标
    const percentPos = pixelPointToPercent(
      { x: clientX, y: clientY },
      screenWidth,
      screenHeight
    );

    // 发送拖动事件
    onDrag(window.id, percentPos);

    // 记录拖动历史（用于计算速度）
    const now = Date.now();
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

    // 计算抛投速度
    const now = Date.now();
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

  // 监听撕裂动画
  useEffect(() => {
    if (contestData && contestData.timeLeft <= 0) {
      setIsTearing(true);
    }
  }, [contestData]);

  // 计算样式
  const style: CSSProperties = {
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
    transition: isDragging ? 'none' : 'all 0.1s ease-out',
    transform: 'translate(-50%, -50%)',
    
    // CSS变量用于动画
    ['--float-x' as string]: `${window.floatAnimation.offsetX}px`,
    ['--float-y' as string]: `${window.floatAnimation.offsetY}px`,
    ['--float-duration' as string]: `${window.floatAnimation.duration}s`,
  };

  // 添加动画类
  let animationClass = '';
  if (isTearing) {
    animationClass = 'tear-animation';
  } else if (contestData) {
    animationClass = 'shake-animation';
    style['--shake-intensity' as string] = `${contestData.shakeIntensity}px`;
  } else if (!isDragging && !window.isDragging) {
    animationClass = 'float-animation';
  }

  return (
    <>
      <div
        ref={windowRef}
        className={`popup-window ${animationClass}`}
        style={style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="popup-content">
          {window.message}
        </div>

        {/* 抢夺倒计时UI */}
        {contestData && !isTearing && (
          <div className="contest-indicator">
            <div
              className="contest-progress"
              style={{
                width: `${contestData.progress * 100}%`,
                backgroundColor: contestData.progress > 0.7 ? '#ff4444' : '#ffaa00'
              }}
            />
            <div className="contest-text">
              {contestData.userCount} 人抢夺中！{Math.ceil(contestData.timeLeft / 1000)}s
            </div>
          </div>
        )}
      </div>

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
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 120%;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          padding: 5px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          text-align: center;
        }

        .contest-progress {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 8px;
          transition: width 0.1s linear, background-color 0.3s;
          opacity: 0.3;
        }

        .contest-text {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </>
  );
};

