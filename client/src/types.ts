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
  generation_mode: string;
  min_window_lifetime: string;
  max_window_lifetime: string;
  enable_auto_cleanup: string;
  tear_base_duration: string;
  shake_intensity_multiplier: string;
  tear_animation_duration: string;
  // 性能优化配置
  enable_gpu_acceleration: string;
  enable_batch_rendering: string;
  disable_float_animation_mobile: string;
  physics_fps_mobile: string;
  broadcast_throttle: string;
  max_windows_mobile: string;
  auto_detect_device: string;
  // Debug 日志控制
  enable_debug_logs: string;
  // 撕裂动画风格配置
  tear_animation_style: string;
  tear_performance_mode: string;
  tear_crack_start_ratio: string;
  tear_fragment_lifetime: string;
  tear_fragment_fade_duration: string;
  tear_enable_rotation: string;
  tear_enable_scale: string;
  tear_particle_count: string;
  tear_enable_blur: string;
  tear_enable_glow: string;
  // 抢夺UI显示
  show_contest_indicator: string;
  // 墙壁系统配置
  enable_wall_system: string;
  wall_capture_duration: string;
  wall_capture_scale: string;
  wall_capture_bg_fade_multiplier: string;
  wall_capture_text_fade_multiplier: string;
  wall_capture_move_speed: string;
  wall_border_width: string;
  wall_proximity_threshold: string;
  wall_persistence_mode: string;
  wall_json_file_path: string;
  mysql_write_delay: string;
}

export interface WallState {
  top: WallOwner | null;
  right: WallOwner | null;
  bottom: WallOwner | null;
  left: WallOwner | null;
}

export interface WallOwner {
  userId: string;
  socketId: string;
  assignedAt: number;
}

export type WallEdge = 'top' | 'right' | 'bottom' | 'left';

export interface CapturedWindow {
  windowId: string;
  window: WindowData;
  edge: WallEdge;
}

