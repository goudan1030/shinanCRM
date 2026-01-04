#!/bin/bash

# 只在现有Nginx配置基础上添加location块，不替换整个文件

CONF_FILE="/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

if [ ! -f "$CONF_FILE" ]; then
    echo "❌ 配置文件不存在: $CONF_FILE"
    exit 1
fi

echo "📝 备份配置文件..."
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"

echo "📝 检查现有配置..."

# 检查是否已有这些location
if grep -q "location /_next/static/" "$CONF_FILE"; then
    echo "⚠️  已存在 location /_next/static/，先删除旧的..."
    # 删除旧的配置块（从注释开始到配置结束）
    sed -i '/# ========== Next.js静态资源配置/,/# ========== 静态资源配置结束 ==========/d' "$CONF_FILE"
fi

# 要添加的配置
NEW_CONFIG='    # ========== Next.js静态资源配置 - 必须在 location / 之前 ==========
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    location ~* \.js$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        add_header Content-Type "application/javascript; charset=utf-8" always;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    # ========== 静态资源配置结束 ==========
'

# 在 location / { 之前插入
if grep -q "location / {" "$CONF_FILE"; then
    # 使用Python插入
    python3 << PYEOF
import re

conf_file = "$CONF_FILE"

with open(conf_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 要插入的配置
new_config = """    # ========== Next.js静态资源配置 ==========
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    location ~* \\.js\$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_buffering off;
        add_header Content-Type "application/javascript; charset=utf-8" always;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    # ========== 配置结束 ==========
"""

# 在 location / { 之前插入
if 'location / {' in content:
    content = content.replace('    location / {', new_config + '\n    location / {')
    with open(conf_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 配置已添加")
else:
    print("❌ 找不到 location / {")
    exit(1)
PYEOF

    if [ $? -ne 0 ]; then
        echo "❌ Python插入失败，使用sed方法..."
        # 备用方法
        sed -i '/location \/ {/i\
    # Next.js静态资源\
    location /_next/static/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
    location ~* \\.js$ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        add_header Content-Type "application/javascript; charset=utf-8" always;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
    location /fonts/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
' "$CONF_FILE"
    fi
else
    echo "❌ 找不到 location / { 配置"
    exit 1
fi

echo "🧪 测试Nginx配置..."
/www/server/nginx/sbin/nginx -t

if [ $? -ne 0 ]; then
    echo "❌ 配置测试失败，恢复备份..."
    LATEST_BACKUP=$(ls -t ${CONF_FILE}.bak.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$CONF_FILE"
        echo "✅ 已恢复备份"
    fi
    exit 1
fi

echo "✅ 配置测试通过"
echo ""
echo "📝 现在请在宝塔面板中："
echo "1. 打开站点配置 -> 配置文件"
echo "2. 点击'保存'按钮"
echo "3. 如果还有错误，请告诉我具体的错误信息"
