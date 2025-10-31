/**
 * 类型定义
 */

export interface Point {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowColors {
  bg: string;
  text: string;
}

export interface FloatAnimation {
  offsetX: number;
  offsetY: number;
  duration: number;
}

export interface WindowData {
  id: string;
  message: string;
  position: Point; // 百分比坐标
  velocity?: Point; // 速度
  size: WindowSize;
  colors: WindowColors;
  fontSize: number;
  floatAnimation: FloatAnimation;
  timestamp: number;
  
  // 交互状态
  grabbedBy?: string[];
  isContested?: boolean;
  isDragging?: boolean;
}

export interface ContestedData {
  windowId: string;
  userCount: number;
  timeLeft: number;
  shakeIntensity: number;
  progress: number;
}

export interface PhysicsUpdate {
  id: string;
  position: Point;
  velocity: Point;
}

export interface Message {
  id: number;
  content: string;
  bg_color: string;
  text_color: string;
  created_at: string;
}

export interface Settings {
  max_windows: string;
  interval: string;
  batch_count: string;
  window_width: string;
  window_height: string;
  size_random: string;
  position_offset: string;
  font_size: string;
  font_random: string;
  float_range: string;
  physics_fps: string;
}

