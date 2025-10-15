#!/bin/bash

# 这个脚本用于修复Next.js静态资源路径问题
# 问题：浏览器请求的是 /_next/static/ 路径，但服务器上文件在 /.next/static/ 目录

# 连接到服务器
ssh root@121.41.65.220 << 'EOT'
# 停止应用
pm2 stop sncrm || true

# 创建_next目录的符号链接
cd /www/wwwroot/sncrm/
ln -sf .next _next

# 修改Nginx配置
cat > /www/server/panel/vhost/nginx/sncrm.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 121.41.65.220;
    root /www/wwwroot/sncrm;
    index index.html index.htm;

    # 将所有请求代理到Next.js应用
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
    }

    # 直接提供静态文件
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 访问日志配置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF

# 重启Nginx
/etc/init.d/nginx restart

# 重启应用
pm2 restart sncrm || pm2 start /www/wwwroot/sncrm/server.js --name sncrm -- -p 3001

echo "修复完成，请访问 http://crm.xinghun.info 检查问题是否解决"
EOT 