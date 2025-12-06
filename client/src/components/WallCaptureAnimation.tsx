/**
 * 墙壁捕获动画组件
 * 窗口被墙壁捕获后的动画效果（仅对墙壁主人播放）
 */
import { useEffect, useState, useRef, startTransition } from 'react';
import type { WindowData, WallEdge, Settings } from '../types';

interface WallCaptureAnimationProps {
  window: WindowData;
  edge: WallEdge;
  settings: Settings | null;
  onComplete: () => void;
}

export const WallCaptureAnimation = ({
  window: windowData,
  edge,
  settings,
  onComplete
}: WallCaptureAnimationProps) => {
  const [animationState, setAnimationState] = useState<'moving' | 'scaling' | 'fading'>('moving');
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析配置
  const captureDuration = parseInt(settings?.wall_capture_duration || '3000');
  const captureScale = parseFloat(settings?.wall_capture_scale || '3');
  const bgFadeMultiplier = parseFloat(settings?.wall_capture_bg_fade_multiplier || '3');
  const textFadeMultiplier = parseFloat(settings?.wall_capture_text_fade_multiplier || '1');
  const moveSpeed = parseInt(settings?.wall_capture_move_speed || '500');

  // 计算目标中心位置（50%, 50%）
  const centerX = 50;
  const centerY = 50;

  // ✅ 使用窗口的真实碰撞位置作为初始位置（服务器已传递碰撞前的真实位置）
  // 不再根据边缘强制设为 0/100，这会导致"嵌墙"效果
  const initialPos = {
    x: windowData.position.x,
    y: windowData.position.y
  };
  
  console.log(`🎬 [捕获动画] 初始化动画 - 边缘: ${edge}, 起始位置: (${initialPos.x.toFixed(1)}%, ${initialPos.y.toFixed(1)}%)`);

  useEffect(() => {
    let isCleanedUp = false;

    // ✅ 使用 requestAnimationFrame 替代 setTimeout，避免主线程阻塞
    const startTime = performance.now();
    const totalDuration = moveSpeed + captureDuration + 500;

    const animate = (currentTime: number) => {
      if (isCleanedUp) return;
      
      const elapsed = currentTime - startTime;

      // 阶段1：移动到中心（使用 startTransition 降低优先级）
      if (elapsed >= moveSpeed && animationState === 'moving') {
        startTransition(() => {
          setAnimationState('scaling');
        });
      }

      // 阶段2：放大和淡出（使用 startTransition 降低优先级）
      if (elapsed >= moveSpeed + captureDuration && animationState === 'scaling') {
        startTransition(() => {
          setAnimationState('fading');
        });
      }

      // 阶段3：完成
      if (elapsed >= totalDuration) {
        console.log(`✅ [动画完成] 窗口 ${windowData.id.slice(0, 8)} 动画播放完成，调用 onComplete`);
        onComplete();
        return;
      }

      // 继续下一帧
      requestAnimationFrame(animate);
    };

    const rafId = requestAnimationFrame(animate);
    
    // ✅ 强制清理定时器（防止动画卡住）- 保留作为最后保障
    const forceCleanupTimer = setTimeout(() => {
      if (!isCleanedUp) {
        console.warn(`⚠️ [强制清理] 窗口 ${windowData.id.slice(0, 8)} 动画超时，强制清理`);
        onComplete();
      }
    }, totalDuration + 2000) as unknown as number; // 额外2秒容错

    return () => {
      isCleanedUp = true;
      cancelAnimationFrame(rafId);
      clearTimeout(forceCleanupTimer);
    };
  }, [moveSpeed, captureDuration, onComplete, windowData.id, animationState]);

  // 计算当前变换
  const getTransformStyle = (): React.CSSProperties => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const startX = (initialPos.x / 100) * screenWidth;
    const startY = (initialPos.y / 100) * screenHeight;
    const endX = (centerX / 100) * screenWidth;
    const endY = (centerY / 100) * screenHeight;

    if (animationState === 'moving') {
      return {
        left: `${startX}px`,
        top: `${startY}px`,
        transform: 'translate(-50%, -50%) scale(1)',
        transition: `left ${moveSpeed}ms ease-out, top ${moveSpeed}ms ease-out`
      };
    } else if (animationState === 'scaling') {
      return {
        left: `${endX}px`,
        top: `${endY}px`,
        transform: `translate(-50%, -50%) scale(${captureScale})`,
        transition: `transform ${captureDuration}ms ease-in-out`
      };
    } else {
      // fading
      return {
        left: `${endX}px`,
        top: `${endY}px`,
        transform: `translate(-50%, -50%) scale(${captureScale})`,
        opacity: 0,
        transition: 'opacity 500ms ease-out'
      };
    }
  };

  // 背景淡出
  const getBgOpacity = () => {
    if (animationState === 'moving') return 1;
    if (animationState === 'scaling') {
      // 在scaling阶段逐渐淡出（3倍时长）
      return 1;
    }
    return 0;
  };

  // 文字淡出（更快）
  const getTextOpacity = () => {
    if (animationState === 'moving') return 1;
    if (animationState === 'scaling') {
      return 1;
    }
    return 0;
  };

  const bgFadeDuration = captureDuration * bgFadeMultiplier;
  const textFadeDuration = captureDuration * textFadeMultiplier;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        width: `${windowData.size.width}px`,
        height: `${windowData.size.height}px`,
        zIndex: 10000,
        pointerEvents: 'none',
        ...getTransformStyle()
      }}
    >
      {/* 窗口背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: windowData.colors.bg,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          opacity: getBgOpacity(),
          transition: `opacity ${bgFadeDuration}ms ease-out`
        }}
      />
      
      {/* 窗口文字 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px',
          color: windowData.colors.text,
          fontSize: `${windowData.fontSize}px`,
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontWeight: 500,
          textAlign: 'center',
          lineHeight: 1.4,
          opacity: getTextOpacity(),
          transition: `opacity ${textFadeDuration}ms ease-out`
        }}
      >
        {windowData.message}
      </div>
    </div>
  );
};

