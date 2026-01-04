#!/bin/bash

# 手动修复Nginx配置 - 更可靠的方法

CONF_FILE="/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

if [ ! -f "$CONF_FILE" ]; then
    echo "❌ 配置文件不存在: $CONF_FILE"
    exit 1
fi

echo "📝 备份配置文件..."
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"

echo "📝 检查是否已有配置..."
if grep -q "location /_next/static/" "$CONF_FILE"; then
    echo "⚠️  已存在 /_next/static/ 配置，将更新"
    # 删除旧的配置
    sed -i '/# ========== 修复MIME类型配置/,/# ========== 配置结束 ==========/d' "$CONF_FILE"
fi

echo "📝 添加新配置..."

# 在 location / { 之前插入配置
python3 << 'PYTHON_SCRIPT'
import re

conf_file = "/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

with open(conf_file, 'r') as f:
    content = f.read()

# 要插入的配置
new_config = '''    # ========== 修复MIME类型配置 - 自动添加 ==========
    # Next.js静态资源 - 优先匹配
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    
    # JS文件强制MIME类型
    location ~* \.js$ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
        add_header Content-Type "application/javascript; charset=utf-8" always;
    }
    
    # 字体文件
    location /fonts/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    # ========== 配置结束 ==========
'''

# 在 location / { 之前插入
pattern = r'(location\s+/\s+\{)'
replacement = new_config + r'\n    \1'

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open(conf_file, 'w') as f:
        f.write(content)
    print("✅ 配置已添加")
else:
    # 如果找不到 location / {，添加到 server { 块内
    pattern = r'(server\s+\{)'
    replacement = r'\1\n' + new_config
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        with open(conf_file, 'w') as f:
            f.write(content)
        print("✅ 配置已添加到server块")
    else:
        print("❌ 无法找到插入位置")
        exit(1)
PYTHON_SCRIPT

if [ $? -ne 0 ]; then
    echo "❌ Python脚本执行失败，使用sed方法..."
    
    # 备用方法：使用sed
    sed -i '/location \/ {/i\
    # ========== 修复MIME类型配置 ==========\
    location /_next/static/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        add_header Content-Type "application/javascript; charset=utf-8" always;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
    location ~* \\.js$ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_buffering off;\
        add_header Content-Type "application/javascript; charset=utf-8" always;\
    }\
    location /fonts/ {\
        proxy_pass http://127.0.0.1:3001;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        expires 365d;\
        add_header Cache-Control "public, max-age=31536000, immutable" always;\
    }\
    # ========== 配置结束 ==========\
' "$CONF_FILE"
fi

echo "🧪 测试Nginx配置..."
/www/server/nginx/sbin/nginx -t 2>/dev/null || nginx -t

if [ $? -ne 0 ]; then
    echo "❌ 配置测试失败，恢复备份..."
    cp "${CONF_FILE}.bak."* "$CONF_FILE" 2>/dev/null
    exit 1
fi

echo "🔄 重载Nginx..."
/www/server/nginx/sbin/nginx -s reload 2>/dev/null || systemctl reload nginx || service nginx reload

echo "✅ 完成！"
