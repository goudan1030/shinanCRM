#!/bin/bash

# 紧急修复Nginx MIME类型问题
# 修复JS文件被当作HTML返回的问题

echo "🔧 紧急修复Nginx MIME类型配置..."

# 查找admin.xinghun.info的Nginx配置文件
NGINX_CONF_DIR="/www/server/panel/vhost/nginx"
CONF_FILE=""

# 查找配置文件
if [ -f "$NGINX_CONF_DIR/admin.xinghun.info.conf" ]; then
    CONF_FILE="$NGINX_CONF_DIR/admin.xinghun.info.conf"
elif [ -f "/etc/nginx/conf.d/admin.xinghun.info.conf" ]; then
    CONF_FILE="/etc/nginx/conf.d/admin.xinghun.info.conf"
elif [ -f "/etc/nginx/sites-available/admin.xinghun.info" ]; then
    CONF_FILE="/etc/nginx/sites-available/admin.xinghun.info"
else
    echo "❌ 找不到Nginx配置文件，尝试查找..."
    CONF_FILE=$(find /etc/nginx /www/server/nginx -name "*admin.xinghun.info*" -type f 2>/dev/null | head -1)
fi

if [ -z "$CONF_FILE" ] || [ ! -f "$CONF_FILE" ]; then
    echo "❌ 无法找到Nginx配置文件"
    echo "请手动指定配置文件路径"
    exit 1
fi

echo "📝 找到配置文件: $CONF_FILE"

# 备份原配置
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
echo "✅ 已备份原配置"

# 查找mime.types文件
MIME_TYPES=""
if [ -f "/www/server/nginx/conf/mime.types" ]; then
    MIME_TYPES="/www/server/nginx/conf/mime.types"
elif [ -f "/etc/nginx/mime.types" ]; then
    MIME_TYPES="/etc/nginx/mime.types"
elif [ -f "/usr/local/nginx/conf/mime.types" ]; then
    MIME_TYPES="/usr/local/nginx/conf/mime.types"
else
    MIME_TYPES=$(find /www/server/nginx /etc/nginx /usr/local/nginx -name "mime.types" -type f 2>/dev/null | head -1)
fi

if [ -z "$MIME_TYPES" ] || [ ! -f "$MIME_TYPES" ]; then
    echo "⚠️  未找到mime.types文件，将跳过include，直接设置MIME类型"
    USE_MIME_TYPES=0
else
    echo "✅ 找到mime.types: $MIME_TYPES"
    USE_MIME_TYPES=1
fi

# 创建修复后的配置
cat > /tmp/nginx_fix.conf << EOF
    # 修复MIME类型 - 必须在server块的最前面
EOF

if [ "$USE_MIME_TYPES" = "1" ]; then
    echo "    include $MIME_TYPES;" >> /tmp/nginx_fix.conf
fi

cat >> /tmp/nginx_fix.conf << 'EOF'
    default_type application/octet-stream;
    
    # 确保JS文件有正确的MIME类型
    location ~* \.js$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 强制设置正确的MIME类型
        add_header Content-Type "application/javascript; charset=utf-8" always;
        
        # 静态资源缓存
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        
        # 禁用代理缓冲，确保MIME类型正确传递
        proxy_buffering off;
    }
    
    # Next.js静态资源 - 必须优先匹配
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 强制设置正确的MIME类型
        location ~* \.js$ {
            add_header Content-Type "application/javascript; charset=utf-8" always;
        }
        location ~* \.css$ {
            add_header Content-Type "text/css; charset=utf-8" always;
        }
        
        # 静态资源缓存
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        
        # 禁用代理缓冲
        proxy_buffering off;
    }
    
    # 字体文件处理
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # 字体文件MIME类型
        location ~* \.woff2$ {
            add_header Content-Type "font/woff2" always;
        }
        location ~* \.woff$ {
            add_header Content-Type "font/woff" always;
        }
        
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 其他静态文件
    location ~* \.(woff|woff2|ttf|otf|eot)$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # 字体MIME类型
        add_header Content-Type "font/woff2" always;
        
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
EOF

echo "📝 检查当前配置..."
if grep -q "location /_next/static/" "$CONF_FILE"; then
    echo "✅ 找到现有的 /_next/static/ 配置"
else
    echo "⚠️  未找到 /_next/static/ 配置，将添加"
fi

# 在server块中添加配置（在location /之前）
if grep -q "location / {" "$CONF_FILE"; then
    # 准备插入的配置
    INSERT_CONFIG="# ========== 修复MIME类型配置 - 自动添加 =========="
    if [ "$USE_MIME_TYPES" = "1" ]; then
        INSERT_CONFIG="$INSERT_CONFIG
    include $MIME_TYPES;"
    fi
    INSERT_CONFIG="$INSERT_CONFIG
    default_type application/octet-stream;
    
    # Next.js静态资源 - 优先匹配
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control \"public, max-age=31536000, immutable\" always;
        add_header Content-Type \"application/javascript; charset=utf-8\" always;
    }
    
    # 字体文件
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        expires 365d;
        add_header Cache-Control \"public, max-age=31536000, immutable\" always;
    }
    
    # JS文件强制MIME类型
    location ~* \\.js\$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_buffering off;
        add_header Content-Type \"application/javascript; charset=utf-8\" always;
    }
    # ========== 配置结束 =========="
    
    # 在 location / 之前插入新配置
    echo "$INSERT_CONFIG" | sed -i '/location \/ {/r /dev/stdin' "$CONF_FILE"
    \
    # Next.js静态资源 - 优先匹配\
    location /_next/static/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_buffering off;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
        add_header Content-Type "application/javascript; charset=utf-8" always;\
    }\
    \
    # 字体文件\
    location /fonts/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
    \
    # JS文件强制MIME类型\
    location ~* \\.js$ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        add_header Content-Type "application/javascript; charset=utf-8" always;\
    }\
    # ========== 配置结束 ==========\
' "$CONF_FILE"
else
    echo "⚠️  未找到 location / 配置，将添加到server块末尾"
    cat /tmp/nginx_fix.conf >> "$CONF_FILE"
fi

echo "✅ 配置已更新"

# 测试Nginx配置
echo "🧪 测试Nginx配置..."
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx配置测试失败，恢复备份..."
    cp "${CONF_FILE}.bak."* "$CONF_FILE" 2>/dev/null || echo "⚠️  无法恢复备份，请手动检查配置"
    exit 1
fi

# 重载Nginx
echo "🔄 重载Nginx..."
nginx -s reload || systemctl reload nginx || service nginx reload

if [ $? -eq 0 ]; then
    echo "✅ Nginx已重载"
else
    echo "❌ Nginx重载失败，请手动执行: nginx -s reload"
    exit 1
fi

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 请执行以下操作："
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "2. 硬刷新页面（Ctrl+F5）"
echo "3. 检查浏览器控制台是否还有MIME类型错误"
echo ""
echo "🔍 如果问题仍然存在，请检查："
echo "   - PM2应用是否在运行: pm2 status"
echo "   - 应用端口是否正确: ss -lntp | grep 3001"
echo "   - Nginx错误日志: tail -f /www/wwwlogs/admin.xinghun.info.error.log"
