/**
 * 墙壁边框组件
 * 渲染4个屏幕边缘的彩色边框，显示墙壁分配状态
 */
import { useEffect, useState } from 'react';
import type { WallState, Settings } from '../types';

interface WallBordersProps {
  wallState: WallState;
  settings: Settings | null;
  windowPositions?: Array<{ x: number; y: number }>; // 窗口位置，用于高亮检测
}

export const WallBorders = ({ wallState, settings, windowPositions = [] }: WallBordersProps) => {
  const [highlightedWalls, setHighlightedWalls] = useState({ top: false, right: false, bottom: false, left: false });
  
  // 边框宽度
  const borderWidth = parseInt(settings?.wall_border_width || '8');
  
  // 接近阈值（百分比）
  const proximityThreshold = parseFloat(settings?.wall_proximity_threshold || '15');

  // 检测窗口接近墙壁
  useEffect(() => {
    if (!windowPositions || windowPositions.length === 0) {
      setHighlightedWalls({ top: false, right: false, bottom: false, left: false });
      return;
    }

    const newHighlights = { top: false, right: false, bottom: false, left: false };

    for (const pos of windowPositions) {
      // 检查接近上墙
      if (pos.y < proximityThreshold && wallState.top) {
        newHighlights.top = true;
      }
      // 检查接近右墙
      if (pos.x > (100 - proximityThreshold) && wallState.right) {
        newHighlights.right = true;
      }
      // 检查接近下墙
      if (pos.y > (100 - proximityThreshold) && wallState.bottom) {
        newHighlights.bottom = true;
      }
      // 检查接近左墙
      if (pos.x < proximityThreshold && wallState.left) {
        newHighlights.left = true;
      }
    }

    setHighlightedWalls(newHighlights);
  }, [windowPositions, wallState, proximityThreshold]);

  // 墙壁颜色配置
  const wallColors = {
    top: '#ff4444',
    right: '#4444ff',
    bottom: '#44ff44',
    left: '#ffff44'
  };

  // 获取墙壁样式
  const getWallStyle = (edge: 'top' | 'right' | 'bottom' | 'left', hasOwner: boolean) => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: wallColors[edge],
      opacity: hasOwner ? (highlightedWalls[edge] ? 0.8 : 0.5) : 0,
      transition: 'opacity 0.3s ease-in-out',
      pointerEvents: 'none',
      zIndex: 9999,
      boxShadow: highlightedWalls[edge] ? `0 0 20px ${wallColors[edge]}` : 'none'
    };

    switch (edge) {
      case 'top':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          right: 0,
          height: `${borderWidth}px`
        };
      case 'right':
        return {
          ...baseStyle,
          top: 0,
          right: 0,
          bottom: 0,
          width: `${borderWidth}px`
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: 0,
          left: 0,
          right: 0,
          height: `${borderWidth}px`
        };
      case 'left':
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          bottom: 0,
          width: `${borderWidth}px`
        };
    }
  };

  // 等待墙壁提示
  const showWaitingHint = !wallState.top && !wallState.right && !wallState.bottom && !wallState.left;

  return (
    <>
      {/* 上墙 */}
      <div style={getWallStyle('top', !!wallState.top)} />
      
      {/* 右墙 */}
      <div style={getWallStyle('right', !!wallState.right)} />
      
      {/* 下墙 */}
      <div style={getWallStyle('bottom', !!wallState.bottom)} />
      
      {/* 左墙 */}
      <div style={getWallStyle('left', !!wallState.left)} />

      {/* 等待提示 */}
      {showWaitingHint && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.3)',
          color: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '8px',
          fontSize: '12px',
          pointerEvents: 'none',
          zIndex: 10000
        }}>
          等待墙壁空闲...
        </div>
      )}
    </>
  );
};

