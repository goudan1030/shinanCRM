module.exports = {
  apps: [{
    name: 'sncrm-new',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      NEXT_PUBLIC_BASE_URL: 'https://admin.xinghun.info'
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
} 