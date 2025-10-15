#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "正在修复PM2配置问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 备份当前配置
echo "备份当前PM2配置..."
if [ -f "ecosystem.config.js" ]; then
  cp ecosystem.config.js ecosystem.config.js.bak.$(date +%Y%m%d%H%M%S)
fi

# 创建新的PM2配置
echo "创建新的PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sncrm',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/sncrm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
EOF

# 停止当前应用
echo "停止当前应用..."
pm2 stop sncrm

# 删除当前应用
echo "删除当前应用..."
pm2 delete sncrm

# 启动应用
echo "使用新配置启动应用..."
pm2 start ecosystem.config.js

# 保存配置
pm2 save

echo "PM2配置修复完成。"
EOT

echo "PM2配置问题修复脚本已运行。"
echo "请访问 http://crm.xinghun.info 测试登录功能。" 