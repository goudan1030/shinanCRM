#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "快速修复Nginx静态资源配置..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "更新Nginx配置以正确处理静态资源..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    
    # 反向代理所有请求到Next.js应用
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
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

echo "测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "重新加载Nginx..."
    nginx -s reload
    echo "Nginx配置已更新"
else
    echo "Nginx配置测试失败"
    exit 1
fi

echo "检查应用状态..."
pm2 status

echo "重启Next.js应用以确保静态资源正确加载..."
pm2 restart sncrm

sleep 3

echo "测试静态资源..."
curl -I http://127.0.0.1:3001/_next/static/ 2>/dev/null || echo "静态资源路径可能不存在"

echo ""
echo "配置修复完成!"
echo "请清除浏览器缓存后重新访问: http://crm.xinghun.info"
EOT

echo "Nginx配置修复完成" 