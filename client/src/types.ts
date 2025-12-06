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
  wall_capture_confirm_timeout: string;
  wall_lock_auto_cleanup_interval: string;
  captured_window_cleanup_timeout: string;
  // 拖动事件节流配置
  broadcast_throttle_enabled: string;
  broadcast_throttle_interval: string;
  // 双根渲染架构配置
  enable_dual_root: string;
  drag_throttle_enabled: string;
  drag_throttle_interval: string;
  enable_concurrent_mode: string;
  enable_animation_worker: string;
  
  // Phase 2: WebGL渲染优化
  enable_webgl_rendering: string;
  webgl_antialiasing: string;
  webgl_max_particles: string;
  
  // Phase 2: 网络批处理
  websocket_batch_enabled: string;
  websocket_batch_interval: string;
  websocket_compression: string;
  
  // Phase 2: 同步增强
  enable_reliable_events: string;
  sync_validation_interval: string;
  frame_sync_enabled: string;
  frame_sync_throttle: string;
  
  // Phase 3: WebGL超真实撕裂效果配置
  // 裂纹效果
  tear_crack_layers?: string;           // 裂纹层数 '1' | '2' | '3'
  tear_crack_density?: string;          // 裂纹密度 '0.5' - '2.0'
  tear_crack_glow?: string;             // 裂纹发光强度 '0' - '1'
  tear_enable_shadow?: string;          // 裂纹阴影 '0' | '1'
  tear_crack_width_min?: string;        // 裂纹最小宽度 '1' - '5'
  tear_crack_width_max?: string;        // 裂纹最大宽度 '2' - '10'
  tear_crack_branch_prob?: string;      // 裂纹分支概率 '0' - '1'
  
  // 3D效果
  tear_3d_depth?: string;               // 3D深度 '0' - '500'
  tear_3d_rotation_speed?: string;      // 旋转速度 '0' - '10'
  tear_enable_perspective?: string;     // 透视投影 '0' | '1'
  tear_camera_fov?: string;             // 相机视角 '30' - '120'
  tear_camera_distance?: string;        // 相机距离 '500' - '2000'
  
  // 粒子系统
  tear_particle_count_multiplier?: string; // 粒子数量倍数 '0.1' - '10'
  tear_particle_glass_count?: string;   // 玻璃粒子数 '0' - '1000'
  tear_particle_sparkle_count?: string; // 光点粒子数 '0' - '500'
  tear_particle_smoke_count?: string;   // 烟雾粒子数 '0' - '100'
  tear_particle_lifetime_mult?: string; // 粒子生命周期倍数 '0.5' - '3'
  
  // 视觉特效
  tear_enable_bloom?: string;           // 辉光效果 '0' | '1'
  tear_bloom_threshold?: string;        // 辉光阈值 '0' - '1'
  tear_bloom_intensity?: string;        // 辉光强度 '0' - '3'
  tear_enable_motion_blur?: string;     // 运动模糊 '0' | '1'
  tear_motion_blur_samples?: string;    // 运动模糊采样数 '2' - '16'
  tear_motion_blur_intensity?: string;  // 运动模糊强度 '0' - '1'
  tear_enable_chromatic?: string;       // 色差效果 '0' | '1'
  tear_chromatic_offset?: string;       // 色差偏移 '0' - '5'
  tear_enable_ssao?: string;            // 环境光遮蔽 '0' | '1'
  tear_ssao_radius?: string;            // SSAO半径 '5' - '20'
  tear_ssao_intensity?: string;         // SSAO强度 '0' - '1'
  
  // 动画配置
  tear_animation_total_duration?: string; // 总时长 '2000' - '8000' ms
  tear_phase_cracking_ratio?: string;   // 裂纹阶段占比 '0.1' - '0.5'
  tear_phase_preparing_ratio?: string;  // 准备阶段占比 '0.05' - '0.2'
  tear_phase_explosion_ratio?: string;  // 爆炸阶段占比 '0.02' - '0.1'
  tear_phase_flying_ratio?: string;     // 飞散阶段占比 '0.3' - '0.6'
  tear_phase_fading_ratio?: string;     // 消散阶段占比 '0.1' - '0.3'
  tear_explosion_force?: string;        // 爆炸力度 '0.5' - '2.0'
  tear_slow_motion_factor?: string;     // 慢动作倍率 '0.5' - '1.0'
  
  // 纹理配置
  tear_texture_resolution?: string;     // 纹理分辨率 '1x' | '2x' | '4x'
  tear_texture_filtering?: string;      // 纹理过滤 'nearest' | 'linear'
  tear_enable_mipmaps?: string;         // 启用Mipmaps '0' | '1'
  
  // 碎片配置
  tear_fragment_count?: string;         // 碎片数量 '10' - '100'
  tear_fragment_thickness?: string;     // 碎片厚度 '1' - '10' px
  tear_voronoi_subdivisions?: string;   // Voronoi细分次数 '1' - '5'
  tear_voronoi_perturbation?: string;   // Voronoi扰动 '0' - '50'
  tear_enable_backface?: string;        // 启用背面渲染 '0' | '1'
  
  // 物理配置
  tear_gravity?: string;                // 重力加速度 '0' - '1000'
  tear_air_resistance?: string;         // 空气阻力 '0' - '0.1'
  tear_rotation_damping?: string;       // 旋转阻尼 '0.9' - '1.0'
  tear_initial_speed_mult?: string;     // 初速度倍数 '0.5' - '3.0'
  
  // 光照配置
  tear_lighting_intensity?: string;     // 整体光照强度 '0' - '2'
  tear_ambient_light?: string;          // 环境光 '0' - '1'
  tear_directional_light?: string;      // 方向光强度 '0' - '1'
  tear_light_dir_x?: string;            // 光源方向X '-1' - '1'
  tear_light_dir_y?: string;            // 光源方向Y '-1' - '1'
  tear_light_dir_z?: string;            // 光源方向Z '-1' - '1'
  tear_enable_edge_light?: string;      // 边缘光 '0' | '1'
  tear_edge_light_intensity?: string;   // 边缘光强度 '0' - '2'
  
  // 相机效果
  tear_enable_camera_shake?: string;    // 相机震动 '0' | '1'
  tear_camera_shake_intensity?: string; // 震动强度 '0' - '20'
  tear_camera_shake_duration?: string;  // 震动时长 '100' - '1000' ms
  tear_enable_camera_tracking?: string; // 相机追踪 '0' | '1'
  tear_camera_tracking_smooth?: string; // 追踪平滑度 '0' - '0.5'
  
  // 性能配置
  tear_enable_lod?: string;             // 启用LOD '0' | '1'
  tear_lod_distance_near?: string;      // LOD近距离 '0' - '500'
  tear_lod_distance_far?: string;       // LOD远距离 '500' - '2000'
  tear_enable_culling?: string;         // 视锥剔除 '0' | '1'
  tear_target_fps?: string;             // 目标帧率 '30' | '60' | '120'
  tear_adaptive_quality?: string;       // 自适应质量 '0' | '1'
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

