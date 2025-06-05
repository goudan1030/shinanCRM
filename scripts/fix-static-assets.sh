#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "开始修复静态资源问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 备份当前配置
echo "备份当前Nginx配置..."
cp /www/server/panel/vhost/nginx/crm.xinghun.info.conf /www/server/panel/vhost/nginx/crm.xinghun.info.conf.bak.$(date +%Y%m%d%H%M%S)

# 更新Nginx配置
echo "更新Nginx配置以正确处理Next.js静态资源..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    index index.html index.htm index.php;
    root /www/wwwroot/sncrm;
    
    # Next.js 静态资源缓存
    location /_next/static {
        alias /www/wwwroot/sncrm/.next/static;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 处理Next.js的静态文件
    location ~ ^/_next/static/(.*)$ {
        root /www/wwwroot/sncrm/.next;
        try_files /static/$1 =404;
    }
    
    # 处理字体文件
    location ~ \.(woff|woff2|eot|ttf|otf)$ {
        root /www/wwwroot/sncrm/public;
        try_files $uri /.next/static/media/$uri =404;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # Next.js API路由和其他动态请求
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 处理一般静态文件
    location /public {
        alias /www/wwwroot/sncrm/public;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # 确保public目录下的文件直接可访问
    location ~ ^/(images|fonts|favicon.ico) {
        root /www/wwwroot/sncrm/public;
        access_log off;
        expires 30d;
    }
    
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 确保.next目录有正确的权限
echo "设置正确的目录权限..."
chown -R www:www /www/wwwroot/sncrm/.next
chmod -R 755 /www/wwwroot/sncrm/.next

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t

# 重新加载Nginx配置
echo "重新加载Nginx配置..."
nginx -s reload

# 重新创建export目录
echo "导出静态资源..."
cd /www/wwwroot/sncrm
npm run build

# 确保静态资源已经正确导出
echo "确保静态资源已导出..."
ls -la .next/static

# 修复PM2配置，确保使用正确的启动命令
echo "更新PM2配置..."
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

# 重启应用
echo "重启应用..."
pm2 restart sncrm

echo "静态资源问题修复完成。"
EOT

echo "静态资源修复脚本已运行。"
echo "请清除浏览器缓存后再次访问 http://crm.xinghun.info 测试。" 