#!/bin/bash

# 这个脚本用于修复API连接问题
# 问题：Nginx到Next.js应用的代理配置不正确，导致API请求失败

# 连接到服务器
ssh root@121.41.65.220 << 'EOT'
# 检查PM2应用状态
pm2 list

# 重新启动应用
pm2 stop sncrm
pm2 delete sncrm

# 确保应用在正确的端口启动
cd /www/wwwroot/sncrm/
PORT=3001 pm2 start server.js --name sncrm

# 等待应用启动
sleep 3

# 修改Nginx配置，确保所有请求正确转发
cat > /www/server/panel/vhost/nginx/sncrm.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 121.41.65.220;
    root /www/wwwroot/sncrm;

    # 静态资源直接提供
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 所有其他请求转发到Next.js应用
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 增加缓冲区大小，防止大请求/响应出错
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # 增加超时设置
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    # 访问日志配置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF

# 测试Nginx配置
nginx -t

# 重启Nginx
/etc/init.d/nginx restart

echo "修复完成，请访问 http://crm.xinghun.info 测试登录功能"
EOT 