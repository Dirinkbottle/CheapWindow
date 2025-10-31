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
('physics_fps', '60', '物理引擎帧率')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- 创建索引优化查询
CREATE INDEX idx_settings_key ON settings(`key`);

-- 完成提示
SELECT '数据库初始化完成！' AS message;
SELECT COUNT(*) AS message_count FROM messages;
SELECT COUNT(*) AS setting_count FROM settings;

