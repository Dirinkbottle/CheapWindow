-- 双根渲染架构配置迁移脚本
-- 用于已有数据库升级到双根渲染模式
-- 运行时间：2024-10-31

USE cheap_window;

-- 添加双根渲染相关配置
INSERT INTO settings (`key`, `value`, description) VALUES
('enable_dual_root', '0', '启用双React根渲染 (0=单根模式, 1=双根模式)'),
('drag_throttle_enabled', '0', '客户端拖动事件节流 (0=禁用, 1=启用)'),
('drag_throttle_interval', '33', '客户端拖动节流间隔（毫秒，33ms≈30fps）'),
('enable_concurrent_mode', '1', 'React 18并发模式优化 (0=禁用, 1=启用)'),
('enable_animation_worker', '0', 'Web Worker动画计算 (0=禁用, 1=启用，实验性)')
ON DUPLICATE KEY UPDATE 
  description = VALUES(description);

-- 验证配置已添加
SELECT 
  `key`,
  `value`,
  description
FROM settings
WHERE `key` IN (
  'enable_dual_root',
  'drag_throttle_enabled',
  'drag_throttle_interval',
  'enable_concurrent_mode',
  'enable_animation_worker'
);

-- 显示当前模式
SELECT 
  CASE 
    WHEN `value` = '1' THEN '✅ 双根模式已启用'
    ELSE '✓ 单根模式（默认）'
  END AS '当前渲染模式'
FROM settings
WHERE `key` = 'enable_dual_root';

SELECT '✅ 双根渲染架构配置迁移完成！' AS message;

