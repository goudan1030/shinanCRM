#!/bin/bash

# 修复Nginx buffer大小错误
echo "修复Nginx buffer配置..."

# 备份当前配置
cp /www/server/nginx/conf/nginx.conf /www/server/nginx/conf/nginx.conf.bak

# 检查是否存在proxy_temp_file_write_size指令，如果不存在则添加
if ! grep -q "proxy_temp_file_write_size" /www/server/nginx/conf/nginx.conf; then
  # 在http块中添加配置
  sed -i '/http {/a \    proxy_temp_file_write_size 256k;' /www/server/nginx/conf/nginx.conf
else
  # 更新现有配置
  sed -i 's/proxy_temp_file_write_size .*/proxy_temp_file_write_size 256k;/g' /www/server/nginx/conf/nginx.conf
fi

# 更新站点配置
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOL'
server {
    listen 80;
    server_name crm.xinghun.info;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 设置不缓存，强制刷新会话
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
        
        # 调整缓冲区大小，保持在proxy_temp_file_write_size范围内
        proxy_buffer_size 64k;
        proxy_buffers 4 64k;
        proxy_busy_buffers_size 128k;
        
        # 增加连接超时时间
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }

    # 正确映射静态资源
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires 30d;
        access_log off;
    }

    # 正确映射public目录
    location /public/ {
        alias /www/wwwroot/sncrm/public/;
        expires 30d;
        access_log off;
    }
}
EOL

# 检查Nginx配置
echo "检查Nginx配置..."
nginx -t

# 重启Nginx
echo "重启Nginx服务..."
/etc/init.d/nginx reload

echo "Nginx配置已修复完成！" 