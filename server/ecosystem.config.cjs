/**
 * PM2 配置文件
 * 用于生产环境部署
 */
module.exports = {
  apps: [
    {
      name: 'cheap-window-server',
      script: 'src/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',  // ✅ ES 模块必须使用 fork 模式
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--trace-warnings',  // ✅ 添加警告跟踪
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};

