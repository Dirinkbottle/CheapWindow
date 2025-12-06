-- 添加WebGL超真实撕裂效果配置字段
-- Migration: 002_add_webgl_tear_configs
-- Date: 2025-11-01

-- 使用INSERT ON DUPLICATE KEY UPDATE方式插入默认配置
-- 这样可以兼容现有数据库，不会覆盖已有配置

-- ==================== 裂纹效果配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_crack_layers', '2', '裂纹层数 (1-3)'),
('tear_crack_density', '1.0', '裂纹密度 (0.5-2.0)'),
('tear_crack_glow', '0.6', '裂纹发光强度 (0-1)'),
('tear_enable_shadow', '1', '启用裂纹阴影 (0/1)'),
('tear_crack_width_min', '1', '裂纹最小宽度 (1-5px)'),
('tear_crack_width_max', '4', '裂纹最大宽度 (2-10px)'),
('tear_crack_branch_prob', '0.7', '裂纹分支概率 (0-1)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 3D效果配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_3d_depth', '300', '3D深度 (0-500px)'),
('tear_3d_rotation_speed', '5', '旋转速度 (0-10)'),
('tear_enable_perspective', '1', '启用透视投影 (0/1)'),
('tear_camera_fov', '75', '相机视角 (30-120度)'),
('tear_camera_distance', '1000', '相机距离 (500-2000px)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 粒子系统配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_particle_count_multiplier', '1.0', '粒子数量倍数 (0.1-10)'),
('tear_particle_glass_count', '500', '玻璃粒子数 (0-1000)'),
('tear_particle_sparkle_count', '200', '光点粒子数 (0-500)'),
('tear_particle_smoke_count', '50', '烟雾粒子数 (0-100)'),
('tear_particle_lifetime_mult', '1.0', '粒子生命周期倍数 (0.5-3)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 视觉特效配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_enable_bloom', '1', '启用辉光效果 (0/1)'),
('tear_bloom_threshold', '0.8', '辉光阈值 (0-1)'),
('tear_bloom_intensity', '1.2', '辉光强度 (0-3)'),
('tear_enable_motion_blur', '1', '启用运动模糊 (0/1)'),
('tear_motion_blur_samples', '8', '运动模糊采样数 (2-16)'),
('tear_motion_blur_intensity', '0.7', '运动模糊强度 (0-1)'),
('tear_enable_chromatic', '1', '启用色差效果 (0/1)'),
('tear_chromatic_offset', '2', '色差偏移 (0-5)'),
('tear_enable_ssao', '0', '启用环境光遮蔽 (0/1)'),
('tear_ssao_radius', '10', 'SSAO半径 (5-20)'),
('tear_ssao_intensity', '0.5', 'SSAO强度 (0-1)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 动画配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_animation_total_duration', '4000', '总时长 (2000-8000ms)'),
('tear_phase_cracking_ratio', '0.30', '裂纹阶段占比 (0.1-0.5)'),
('tear_phase_preparing_ratio', '0.10', '准备阶段占比 (0.05-0.2)'),
('tear_phase_explosion_ratio', '0.05', '爆炸阶段占比 (0.02-0.1)'),
('tear_phase_flying_ratio', '0.40', '飞散阶段占比 (0.3-0.6)'),
('tear_phase_fading_ratio', '0.15', '消散阶段占比 (0.1-0.3)'),
('tear_explosion_force', '1.0', '爆炸力度 (0.5-2.0)'),
('tear_slow_motion_factor', '1.0', '慢动作倍率 (0.5-1.0)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 纹理配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_texture_resolution', '2x', '纹理分辨率 (1x/2x/4x)'),
('tear_texture_filtering', 'linear', '纹理过滤 (nearest/linear)'),
('tear_enable_mipmaps', '0', '启用Mipmaps (0/1)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 碎片配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_fragment_count', '50', '碎片数量 (10-100)'),
('tear_fragment_thickness', '5', '碎片厚度 (1-10px)'),
('tear_voronoi_subdivisions', '3', 'Voronoi细分次数 (1-5)'),
('tear_voronoi_perturbation', '15', 'Voronoi扰动 (0-50)'),
('tear_enable_backface', '1', '启用背面渲染 (0/1)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 物理配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_gravity', '300', '重力加速度 (0-1000)'),
('tear_air_resistance', '0.02', '空气阻力 (0-0.1)'),
('tear_rotation_damping', '0.98', '旋转阻尼 (0.9-1.0)'),
('tear_initial_speed_mult', '1.5', '初速度倍数 (0.5-3.0)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 光照配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_lighting_intensity', '1.0', '整体光照强度 (0-2)'),
('tear_ambient_light', '0.4', '环境光 (0-1)'),
('tear_directional_light', '0.8', '方向光强度 (0-1)'),
('tear_light_dir_x', '0.5', '光源方向X (-1 - 1)'),
('tear_light_dir_y', '-1.0', '光源方向Y (-1 - 1)'),
('tear_light_dir_z', '0.5', '光源方向Z (-1 - 1)'),
('tear_enable_edge_light', '1', '启用边缘光 (0/1)'),
('tear_edge_light_intensity', '1.5', '边缘光强度 (0-2)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 相机效果配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_enable_camera_shake', '1', '启用相机震动 (0/1)'),
('tear_camera_shake_intensity', '8', '震动强度 (0-20)'),
('tear_camera_shake_duration', '300', '震动时长 (100-1000ms)'),
('tear_enable_camera_tracking', '1', '启用相机追踪 (0/1)'),
('tear_camera_tracking_smooth', '0.1', '追踪平滑度 (0-0.5)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- ==================== 性能配置 ====================
INSERT INTO settings (setting_key, setting_value, description) VALUES
('tear_enable_lod', '1', '启用LOD (0/1)'),
('tear_lod_distance_near', '200', 'LOD近距离 (0-500)'),
('tear_lod_distance_far', '800', 'LOD远距离 (500-2000)'),
('tear_enable_culling', '1', '启用视锥剔除 (0/1)'),
('tear_target_fps', '60', '目标帧率 (30/60/120)'),
('tear_adaptive_quality', '1', '启用自适应质量 (0/1)')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

-- 验证插入结果
SELECT COUNT(*) as 'WebGL配置项数量' FROM settings WHERE setting_key LIKE 'tear_%';

