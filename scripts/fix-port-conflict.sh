#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复端口冲突问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

# 查找可用端口（3001-3010范围）
echo "查找可用端口..."
for port in {3001..3010}; do
    if ! netstat -tlnp | grep ":$port " > /dev/null; then
        available_port=$port
        echo "找到可用端口: $available_port"
        break
    fi
done

if [ -z "$available_port" ]; then
    echo "错误: 找不到可用端口"
    exit 1
fi

# 更新PM2配置文件
echo "更新PM2配置使用端口 $available_port..."
cat > ecosystem.config.js << EOF
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
        PORT: $available_port
      },
      error_file: '/www/wwwlogs/sncrm_error.log',
      out_file: '/www/wwwlogs/sncrm_out.log',
      log_file: '/www/wwwlogs/sncrm_combined.log'
    }
  ]
};
EOF

# 更新Nginx配置使用新端口
echo "更新Nginx配置使用端口 $available_port..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << EOF
server {
    listen 80;
    server_name crm.xinghun.info;
    
    # 反向代理到Next.js应用
    location / {
        proxy_pass http://127.0.0.1:$available_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 日志配置
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t
if [ $? -ne 0 ]; then
    echo "Nginx配置测试失败"
    exit 1
fi

# 重新加载Nginx
echo "重新加载Nginx配置..."
nginx -s reload

# 停止并重启sncrm应用
echo "重启sncrm应用..."
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

# 启动应用
pm2 start ecosystem.config.js

# 等待应用启动
echo "等待应用启动..."
sleep 5

# 检查应用状态
echo "检查应用状态..."
pm2 status

echo ""
echo "检查端口监听状态..."
netstat -tlnp | grep ":$available_port "

echo ""
echo "=== 应用日志 ==="
pm2 logs sncrm --lines 10 --nostream || echo "暂无日志"

echo ""
echo "=========================================="
echo "端口冲突修复完成！"
echo "=========================================="
echo "应用现在运行在端口: $available_port"
echo "访问地址: http://crm.xinghun.info"
echo ""
EOT

echo "端口冲突修复完成" 