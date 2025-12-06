/**
 * WebGL Demo Server
 * 独立的演示服务器，运行在 3002 端口
 * 提供实时 WebGL 参数调试界面
 */

const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

// 尝试加载根目录或 server 目录的 .env
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.WEBGL_DEMO_PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'cheap_window',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// 初始化数据库连接池
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log('✓ 数据库连接成功');
    connection.release();
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    console.warn('⚠ WebGL Demo 将在没有数据库的情况下运行（使用默认配置）');
  }
}

// 获取所有 WebGL 相关配置
app.get('/api/config', async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: false,
        message: '数据库未连接',
        data: getDefaultConfig()
      });
    }

    const [rows] = await pool.query(
      'SELECT `key`, `value` FROM settings WHERE `key` LIKE "tear_%" OR `key` LIKE "webgl_%"'
    );

    const config = {};
    rows.forEach(row => {
      config[row.key] = row.value;
    });

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: getDefaultConfig()
    });
  }
});

// 保存单个配置
app.post('/api/config/:key', async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: false,
        message: '数据库未连接，无法保存配置'
      });
    }

    const { key } = req.params;
    const { value } = req.body;

    await pool.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, value, value]
    );

    res.json({
      success: true,
      message: '配置已保存'
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 批量保存配置
app.post('/api/config', async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: false,
        message: '数据库未连接，无法保存配置'
      });
    }

    const config = req.body;
    const keys = Object.keys(config);

    if (keys.length === 0) {
      return res.json({ success: true, message: '没有配置需要保存' });
    }

    // 批量更新
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const key of keys) {
        await connection.query(
          'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
          [key, config[key], config[key]]
        );
      }
      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: `已保存 ${keys.length} 个配置`
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('批量保存配置失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// 获取预设配置
app.get('/api/presets/:name', (req, res) => {
  const presets = {
    performance: {
      tear_particle_count: '20',
      tear_enable_rotation: '0',
      tear_enable_scale: '0',
      webgl_antialiasing: '0',
      tear_fragment_lifetime: '2000',
      tear_enable_shadow: '0',
      tear_enable_ssao: '0',
      tear_motion_blur_samples: '0'
    },
    balanced: {
      tear_particle_count: '50',
      tear_enable_rotation: '1',
      tear_enable_scale: '1',
      webgl_antialiasing: '1',
      tear_fragment_lifetime: '3000',
      tear_enable_shadow: '1',
      tear_enable_ssao: '0',
      tear_motion_blur_samples: '3'
    },
    quality: {
      tear_particle_count: '100',
      tear_enable_rotation: '1',
      tear_enable_scale: '1',
      webgl_antialiasing: '1',
      tear_fragment_lifetime: '4000',
      tear_enable_shadow: '1',
      tear_enable_ssao: '1',
      tear_motion_blur_samples: '5'
    },
    extreme: {
      tear_particle_count: '200',
      tear_enable_rotation: '1',
      tear_enable_scale: '1',
      webgl_antialiasing: '1',
      tear_fragment_lifetime: '5000',
      tear_enable_shadow: '1',
      tear_enable_ssao: '1',
      tear_motion_blur_samples: '8',
      tear_enable_bloom: '1',
      tear_enable_edge_light: '1'
    }
  };

  const preset = presets[req.params.name];
  if (preset) {
    res.json({ success: true, data: preset });
  } else {
    res.status(404).json({ success: false, message: '预设不存在' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'webgl-demo',
    port: PORT,
    database: pool ? 'connected' : 'disconnected'
  });
});

// 默认路由 - 返回演示页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 默认配置（当数据库不可用时）
function getDefaultConfig() {
  return {
    // 基础配置
    enable_webgl_rendering: '1',
    webgl_antialiasing: '1',
    
    // 动画时长
    tear_fragment_lifetime: '3000',
    tear_fragment_fade_duration: '1000',
    
    // 粒子系统
    tear_particle_count: '50',
    tear_enable_rotation: '1',
    tear_enable_scale: '1',
    
    // 裂纹
    tear_crack_layers: '3',
    tear_crack_density: '5',
    tear_crack_glow: '1',
    
    // 3D 效果
    tear_3d_depth: '100',
    tear_camera_fov: '60',
    
    // 物理
    tear_gravity: '200',
    tear_air_resistance: '0.02',
    
    // 光照
    tear_lighting_intensity: '1.0',
    tear_ambient_light: '0.3',
    tear_directional_light: '0.7'
  };
}

// 启动服务器
async function start() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log('  🎨 WebGL Demo Server');
    console.log('========================================');
    console.log('');
    console.log(`  访问地址: http://localhost:${PORT}`);
    console.log(`  数据库状态: ${pool ? '✓ 已连接' : '✗ 未连接（使用默认配置）'}`);
    console.log('');
    console.log('  功能：');
    console.log('    - 实时 WebGL 参数调试');
    console.log('    - 4 个性能预设');
    console.log('    - 80+ 可调参数');
    console.log('    - 即时动画预览');
    console.log('');
    console.log('========================================');
    console.log('');
  });
}

start().catch(error => {
  console.error('启动失败:', error);
  process.exit(1);
});

