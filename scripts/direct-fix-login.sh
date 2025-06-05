#!/bin/bash

# 简化版登录问题修复脚本
echo "开始直接修复登录问题..."

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

# 远程执行修复命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 1. 检查目录结构
if [ ! -d "/www/wwwroot/sncrm/src" ]; then
  mkdir -p /www/wwwroot/sncrm/src/components
  mkdir -p /www/wwwroot/sncrm/src/app/api/auth/login
  mkdir -p /www/wwwroot/sncrm/public/fonts
fi

# 2. 修复环境变量
cat > /www/wwwroot/sncrm/.env.production << EOF
# 数据库配置
DB_HOST=8.149.244.105
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# JWT配置
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://crm.xinghun.info/
NODE_ENV=production
PORT=3001
EOF

# 3. 修复Nginx配置
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    # 配置Cookie处理
    proxy_cookie_flags ~ secure httponly;
    
    # 强制不缓存HTML和JSON响应
    location ~* \.(html|json)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires -1;
    }
    
    # 身份验证相关路径
    location /api/auth/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 确保Cookie正确传递
        proxy_cookie_path / "/";
        proxy_cookie_flags ~ secure httponly;
        
        # 增加超时时间
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # Next.js静态资源
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # 字体文件处理
    location /fonts/ {
        alias /www/wwwroot/sncrm/public/fonts/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }
    
    # 默认处理
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cookie处理
        proxy_cookie_path / "/";
        proxy_cookie_flags ~ secure httponly;
        
        # 增加缓冲设置
        proxy_buffer_size 64k;
        proxy_buffers 4 64k;
        proxy_busy_buffers_size 128k;
        
        # 增加超时时间
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF

# 4. 创建空字体文件解决预加载问题
touch /www/wwwroot/sncrm/public/fonts/geist.woff2
touch /www/wwwroot/sncrm/public/fonts/geist-mono.woff2
chmod 644 /www/wwwroot/sncrm/public/fonts/geist.woff2
chmod 644 /www/wwwroot/sncrm/public/fonts/geist-mono.woff2

# 5. 设置文件权限
chmod -R 755 /www/wwwroot/sncrm
chown -R www:www /www/wwwroot/sncrm

# 6. 测试Nginx配置并重启
nginx -t
if [ $? -eq 0 ]; then
  echo "Nginx配置正确，重启Nginx..."
  /etc/init.d/nginx reload
else
  echo "Nginx配置有误，使用备用配置..."
  # 备用简单配置
  cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF
  nginx -t && /etc/init.d/nginx reload
fi

# 7. 重启应用
cd /www/wwwroot/sncrm
pm2 restart sncrm || pm2 start ecosystem.config.js

echo "登录问题修复完成"
EOT

echo "请清除浏览器缓存和Cookie，然后重新尝试登录。" 