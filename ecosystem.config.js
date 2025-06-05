module.exports = {
  apps: [{
    name: 'sncrm',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
} 