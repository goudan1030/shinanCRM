#!/bin/bash

# 完整修复Next.js静态资源404问题的脚本

echo "===== 开始修复Next.js静态资源404问题 ====="
echo "检查时间: $(date)"
echo

# 1. 确保目录存在
echo "===== 确保目录结构正确 ====="
APP_DIR="/www/wwwroot/sncrm"
STATIC_DIR="$APP_DIR/.next/static"
PUBLIC_DIR="$APP_DIR/public"

if [ ! -d "$STATIC_DIR" ]; then
    echo "❌ 静态资源目录不存在: $STATIC_DIR"
    echo "   创建目录..."
    mkdir -p "$STATIC_DIR"
    echo "✅ 静态资源目录已创建"
else
    echo "✅ 静态资源目录已存在: $STATIC_DIR"
fi

if [ ! -d "$PUBLIC_DIR" ]; then
    echo "❌ Public目录不存在: $PUBLIC_DIR"
    echo "   创建目录..."
    mkdir -p "$PUBLIC_DIR"
    echo "✅ Public目录已创建"
else
    echo "✅ Public目录已存在: $PUBLIC_DIR"
fi

# 2. 修复目录权限
echo "===== 修复目录权限 ====="
echo "设置目录所有者为www用户..."
chown -R www:www "$APP_DIR"
chmod -R 755 "$APP_DIR"
echo "✅ 目录权限已设置"

# 3. 更新Nginx配置
echo "===== 更新Nginx配置 ====="
# 备份当前配置
if [ -f "/www/server/panel/vhost/nginx/crm.xinghun.info.conf" ]; then
    cp /www/server/panel/vhost/nginx/crm.xinghun.info.conf /www/server/panel/vhost/nginx/crm.xinghun.info.conf.bak
    echo "✅ 已备份原Nginx配置"
fi

# 创建新的配置
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOL'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    # 强制不缓存HTML和JSON响应
    location ~* \.(html|json)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires -1;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Next.js静态资源 - 精确定位
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # 特殊处理 _next/data 路径
    location /_next/data/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        # 先尝试从public目录提供
        root /www/wwwroot/sncrm;
        try_files /public$uri $uri =404;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # 上传文件目录
    location /uploads/ {
        alias /www/wwwroot/sncrm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
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
EOL
echo "✅ 已更新Nginx配置"

# 4. 测试Nginx配置
echo "===== 测试Nginx配置 ====="
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx配置测试通过"
    echo "   重启Nginx..."
    /etc/init.d/nginx reload
    echo "✅ Nginx已重启"
else
    echo "❌ Nginx配置测试失败，请检查配置"
    # 恢复备份
    if [ -f "/www/server/panel/vhost/nginx/crm.xinghun.info.conf.bak" ]; then
        cp /www/server/panel/vhost/nginx/crm.xinghun.info.conf.bak /www/server/panel/vhost/nginx/crm.xinghun.info.conf
        echo "   已恢复备份配置"
        /etc/init.d/nginx reload
    fi
fi

# 5. 设置pm2配置
echo "===== 设置PM2配置 ====="
if [ ! -f "$APP_DIR/ecosystem.config.js" ]; then
    echo "创建PM2配置文件..."
    cat > $APP_DIR/ecosystem.config.js << 'EOL'
module.exports = {
  apps: [{
    name: 'sncrm',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}
EOL
    echo "✅ PM2配置文件已创建"
fi

# 6. 重启应用
echo "===== 重启应用 ====="
cd $APP_DIR
pm2 reload sncrm || pm2 start ecosystem.config.js
echo "✅ 应用已重启"

# 7. 验证资源可访问性
echo "===== 验证资源可访问性 ====="
STATIC_TEST_URL="http://127.0.0.1:3001/_next/static/"
if command -v curl &> /dev/null; then
    echo "测试静态资源访问..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $STATIC_TEST_URL)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo "✅ 静态资源测试成功 (状态码: $HTTP_CODE)"
    else
        echo "❌ 静态资源测试失败 (状态码: $HTTP_CODE)"
    fi
else
    echo "❌ curl工具未安装，无法测试资源访问性"
fi

echo "===== 静态资源404问题修复完成 ====="
echo "如果仍有问题，请检查日志文件:"
echo "- Nginx错误日志: /www/wwwlogs/sncrm.error.log"
echo "- PM2日志: pm2 logs sncrm"

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复Next.js静态资源404问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

# 检查.next目录结构
echo "检查.next目录结构..."
ls -la .next/
ls -la .next/static/ 2>/dev/null || echo ".next/static目录不存在"

# 获取当前使用的端口
current_port=$(grep "PORT:" ecosystem.config.js | grep -o '[0-9]*' | head -1)
if [ -z "$current_port" ]; then
    current_port=3001
fi
echo "当前应用端口: $current_port"

# 更新Nginx配置以正确处理静态资源
echo "更新Nginx配置以处理静态资源..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << EOF
server {
    listen 80;
    server_name crm.xinghun.info;
    
    # 处理Next.js静态资源
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$current_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # 添加静态资源缓存头
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 处理字体文件
    location /fonts/ {
        proxy_pass http://127.0.0.1:$current_port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 处理favicon等静态文件
    location ~* \.(ico|css|js|gif|jpeg|jpg|png|woff|woff2|ttf|svg|eot|otf)$ {
        proxy_pass http://127.0.0.1:$current_port;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # 其他所有请求
    location / {
        proxy_pass http://127.0.0.1:$current_port;
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

# 检查Next.js构建是否完整
echo "检查Next.js构建状态..."
if [ ! -d ".next" ]; then
    echo "错误: .next目录不存在，需要重新构建"
    echo "重新构建Next.js应用..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "构建失败"
        exit 1
    fi
fi

# 设置正确的文件权限
echo "设置文件权限..."
chown -R www:www .next/
chmod -R 755 .next/
chown -R www:www public/
chmod -R 755 public/

# 重启应用以确保更改生效
echo "重启Next.js应用..."
pm2 restart sncrm

# 等待应用完全启动
echo "等待应用启动..."
sleep 10

# 测试静态资源
echo "测试静态资源访问..."
echo "测试主页..."
curl -I http://127.0.0.1:$current_port/ 2>/dev/null | head -1

echo "测试登录页..."
curl -I http://127.0.0.1:$current_port/login 2>/dev/null | head -1

# 检查.next/static目录内容
echo ""
echo "检查.next/static目录内容..."
if [ -d ".next/static" ]; then
    echo "Static目录存在，内容:"
    find .next/static -name "*.js" | head -5
else
    echo "警告: .next/static目录不存在"
fi

echo ""
echo "=========================================="
echo "静态资源修复完成！"
echo "=========================================="
echo "请清除浏览器缓存后重新访问 http://crm.xinghun.info"
echo ""
EOT

echo "静态资源修复完成" 