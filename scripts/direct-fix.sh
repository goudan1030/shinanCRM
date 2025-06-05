#!/bin/bash

# 该脚本是直接在服务器上执行的修复脚本
# 这个问题是由于缺少BUILD_ID文件和完整的Next.js构建文件结构导致的

# 停止应用
pm2 delete sncrm || true

# 设置部署目录
DEPLOY_DIR="/www/wwwroot/sncrm"
BUILD_ID=$(date +%s)

# 创建必要的目录结构
mkdir -p $DEPLOY_DIR/.next

# 生成BUILD_ID文件
echo $BUILD_ID > $DEPLOY_DIR/.next/BUILD_ID

# 确保静态资源正确链接
cd $DEPLOY_DIR
cat > $DEPLOY_DIR/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SNCRM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=/login">
</head>
<body>
  <p>重定向到登录页面...</p>
</body>
</html>
EOF

# 更新Nginx配置
cat > /www/server/panel/vhost/nginx/sncrm.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    root /www/wwwroot/sncrm;
    index index.html index.htm;

    # 前端资源文件
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 处理Next.js应用
    location /api {
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

    # 登录路由
    location /login {
        proxy_pass http://127.0.0.1:3001/login;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 处理Next.js的静态资源
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri $uri/ =404;
    }

    # 其他静态资源缓存设置
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri $uri/ =404;
    }

    # 访问日志配置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF

# 重启Nginx
/etc/init.d/nginx restart

# 重启应用
cd $DEPLOY_DIR
NODE_ENV=production PORT=3001 pm2 start server.js --name sncrm

echo "修复完成，请检查网站是否正常工作" 