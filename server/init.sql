-- 多人励志弹窗系统数据库初始化脚本
-- 数据库名称: cheap_window
-- 用户: root
-- 密码: 123456

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS cheap_window DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cheap_window;

-- 表1: messages - 励志话语
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content VARCHAR(500) NOT NULL COMMENT '励志话语内容',
    bg_color VARCHAR(20) DEFAULT '#FFE4E1' COMMENT '背景颜色',
    text_color VARCHAR(20) DEFAULT '#333333' COMMENT '文字颜色',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='励志话语表';

-- 表2: settings - 系统配置
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(50) PRIMARY KEY COMMENT '配置键',
    `value` TEXT NOT NULL COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置说明',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 插入默认励志话语（从Python版本迁移）
INSERT INTO messages (content, bg_color, text_color) VALUES
('早点睡觉', '#FFE4E1', '#333333'),
('好好爱自己', '#E0F7FA', '#2C3E50'),
('别生气', '#FFF9C4', '#34495E'),
('保持微笑', '#F3E5F5', '#7F8C8D'),
('你很棒', '#E8F5E9', '#1A237E'),
('加油', '#FFF3E0', '#004D40'),
('要开心', '#FFEBEE', '#333333'),
('多喝水', '#F1F8E9', '#2C3E50'),
('注意休息', '#E1F5FE', '#34495E'),
('相信自己', '#FFF8E1', '#7F8C8D'),
('不要焦虑', '#FCE4EC', '#1A237E'),
('慢慢来', '#E8EAF6', '#004D40'),
('一切都会好的', '#FFE4E1', '#333333'),
('珍惜当下', '#E0F7FA', '#2C3E50'),
('善待自己', '#FFF9C4', '#34495E'),
('放松心情', '#F3E5F5', '#7F8C8D'),
('今天也要元气满满', '#E8F5E9', '#1A237E'),
('一步一个脚印', '#FFF3E0', '#004D40'),
('给自己一个拥抱', '#FFEBEE', '#333333'),
('世界需要你的笑容', '#F1F8E9', '#2C3E50');

-- 插入默认系统配置
INSERT INTO settings (`key`, `value`, description) VALUES
('max_windows', '20', '最大窗口数量'),
('interval', '0.3', '弹窗生成间隔（秒）'),
('batch_count', '3', '每批生成窗口数'),
('window_width', '200', '窗口宽度（百分比基准值，实际使用百分比）'),
('window_height', '80', '窗口高度（百分比基准值）'),
('size_random', '30', '窗口大小随机范围'),
('position_offset', '50', '位置随机偏移范围'),
('font_size', '14', '字体大小（基准值）'),
('font_random', '4', '字体大小随机范围'),
('float_range', '5', '浮动范围（像素）'),
('physics_fps', '60', '物理引擎帧率'),
('generation_mode', 'auto', '生成模式：auto(自动) / manual(手动)'),
('min_window_lifetime', '10', '窗口最小存活时间（秒）'),
('max_window_lifetime', '60', '窗口最大存活时间（秒）'),
('enable_auto_cleanup', '1', '是否自动清理旧窗口 (1=是, 0=否)'),
('tear_base_duration', '5000', '基础撕裂时间（毫秒）'),
('shake_intensity_multiplier', '2', '抖动强度倍数'),
('tear_animation_duration', '1500', '撕裂动画播放时长（毫秒）'),
-- 客户端渲染优化
('enable_gpu_acceleration', '1', '启用 GPU 硬件加速 (1=启用, 0=禁用)'),
('enable_batch_rendering', '1', '启用批量渲染优化 (1=启用, 0=禁用)'),
('disable_float_animation_mobile', '1', '移动端禁用浮动动画 (1=禁用, 0=启用)'),
-- 服务器物理更新
('physics_fps_mobile', '30', '物理引擎帧率（移动端）'),
('broadcast_throttle', '1', '启用广播节流 (1=启用, 0=禁用)'),
-- 移动端优化
('max_windows_mobile', '10', '移动端最大窗口数'),
('auto_detect_device', '1', '自动检测设备类型 (1=启用, 0=禁用)'),
-- Debug 日志控制
('enable_debug_logs', '1', '启用 Debug 日志 (1=启用, 0=禁用)'),
-- 撕裂动画风格配置
('tear_animation_style', 'shatter', '撕裂动画风格: gradual(逐渐破裂)/stretch(拉扯)/shatter(粉碎)'),
('tear_performance_mode', 'balanced', '撕裂动画性能模式: high(高质量)/balanced(平衡)/performance(性能优先)'),
-- 动画细节配置
('tear_crack_start_ratio', '0.33', '裂纹开始生成的倒计时比例 (0-1)'),
('tear_fragment_lifetime', '3000', '碎片存在时间（毫秒）'),
('tear_fragment_fade_duration', '1000', '碎片淡出时间（毫秒）'),
('tear_enable_rotation', '1', '碎片是否旋转 (1=是, 0=否)'),
('tear_enable_scale', '0', '碎片是否缩放 (1=是, 0=否)'),
-- 高质量模式专属
('tear_particle_count', '50', '高质量模式额外粒子数量'),
('tear_enable_blur', '1', '高质量模式启用模糊效果 (1=是, 0=否)'),
('tear_enable_glow', '1', '高质量模式启用发光效果 (1=是, 0=否)'),
-- 抢夺UI显示
('show_contest_indicator', '1', '是否显示抢夺倒计时UI (1=显示, 0=隐藏)'),
-- 墙壁系统
('enable_wall_system', '1', '启用墙壁系统 (1=启用, 0=禁用)'),
('wall_capture_duration', '3000', '窗口捕获动画总时长（毫秒）'),
('wall_capture_scale', '3', '窗口放大倍数'),
('wall_capture_bg_fade_multiplier', '3', '背景淡出时间倍数（相对于动画总时长）'),
('wall_capture_text_fade_multiplier', '1', '文字淡出时间倍数（相对于动画总时长）'),
('wall_capture_move_speed', '500', '窗口移动到中心的速度（毫秒）'),
('wall_border_width', '8', '墙壁边框宽度（像素）'),
('wall_proximity_threshold', '15', '窗口接近墙壁的高亮阈值（百分比距离）'),
-- ✅ 性能优化配置
('wall_persistence_mode', 'mysql', '墙壁持久化模式: memory(纯内存)/json(JSON文件)/mysql(MySQL数据库)'),
('wall_json_file_path', 'data/wall_assignments.json', 'JSON持久化文件路径'),
('mysql_write_delay', '100', 'MySQL/JSON批量写入延迟（毫秒）'),
('wall_lock_duration', '4500', '墙壁动画锁定时长（毫秒，自动计算）'),
('wall_capture_confirm_timeout', '2000', '墙壁捕获确认超时时间（毫秒）'),
('wall_lock_auto_cleanup_interval', '1000', '墙壁锁自动清理间隔（毫秒）'),
('enable_performance_monitor', '1', '是否启用性能监控 (0=关闭, 1=开启)'),
('performance_log_threshold', '50', '性能日志阈值（毫秒，超过则记录警告）')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 创建索引优化查询
CREATE INDEX idx_settings_key ON settings(`key`);

-- 完成提示
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS message_count FROM messages;
SELECT COUNT(*) AS setting_count FROM settings;

