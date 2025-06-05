#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复浏览器缓存问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 停止应用..."
pm2 stop sncrm

echo "2. 清除Next.js缓存..."
rm -rf .next/cache

echo "3. 更新Nginx配置，添加缓存控制头..."
# 备份原始配置
cp /www/server/nginx/conf/nginx.conf /www/server/nginx/conf/nginx.conf.backup

# 检查是否已经有我们的配置
if ! grep -q "no-cache for _next" /www/server/nginx/conf/nginx.conf; then
cat >> /www/server/nginx/conf/nginx.conf << 'EOF'

# 针对Next.js静态资源的缓存控制
server {
    listen 80;
    server_name crm.xinghun.info;
    
    # 对于_next/static文件，添加强制刷新头
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 强制刷新，不使用缓存
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # 其他所有请求
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 对HTML页面也不缓存
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
EOF
fi

echo "4. 重新加载Nginx配置..."
nginx -t && nginx -s reload

echo "5. 完全清除并重新构建应用..."
rm -rf .next
npm run build

echo "6. 启动应用..."
pm2 start sncrm

sleep 3

echo "7. 检查应用状态..."
pm2 status

echo ""
echo "=========================================="
echo "缓存问题修复完成！"
echo "=========================================="
echo "请在浏览器中："
echo "1. 按 Ctrl+Shift+R (或 Cmd+Shift+R) 强制刷新"
echo "2. 或者按 F12 -> Network -> 勾选 'Disable cache'"
echo "3. 或者清除浏览器缓存后重新访问"
EOT

echo "修复完成，请强制刷新浏览器" 