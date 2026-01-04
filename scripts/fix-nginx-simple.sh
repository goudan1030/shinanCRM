#!/bin/bash

# 简单可靠的Nginx修复脚本

CONF_FILE="/www/server/panel/vhost/nginx/admin.xinghun.info.conf"

if [ ! -f "$CONF_FILE" ]; then
    echo "❌ 配置文件不存在: $CONF_FILE"
    exit 1
fi

echo "📝 备份配置文件..."
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"

echo "📝 检查并添加配置..."

# 检查是否已有配置
if grep -q "location /_next/static/" "$CONF_FILE"; then
    echo "⚠️  已存在配置，先删除旧的..."
    # 删除旧的配置块
    sed -i '/# ========== 修复MIME类型配置/,/# ========== 配置结束 ==========/d' "$CONF_FILE"
fi

# 创建临时配置文件片段
cat > /tmp/nginx_fix_block.conf << 'EOF'
    # ========== 修复MIME类型配置 - 自动添加 ==========
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
EOF

# 在 location / { 之前插入配置
if grep -q "location / {" "$CONF_FILE"; then
    # 使用awk插入
    awk '
    /location \/ \{/ {
        while ((getline line < "/tmp/nginx_fix_block.conf") > 0) {
            print line
        }
        close("/tmp/nginx_fix_block.conf")
    }
    { print }
    ' "$CONF_FILE" > "${CONF_FILE}.tmp" && mv "${CONF_FILE}.tmp" "$CONF_FILE"
    echo "✅ 配置已添加到 location / { 之前"
else
    # 如果找不到 location / {，添加到 server { 之后
    if grep -q "server {" "$CONF_FILE"; then
        awk '
        /server \{/ {
            print
            getline
            while ((getline line < "/tmp/nginx_fix_block.conf") > 0) {
                print line
            }
            close("/tmp/nginx_fix_block.conf")
        }
        { print }
        ' "$CONF_FILE" > "${CONF_FILE}.tmp" && mv "${CONF_FILE}.tmp" "$CONF_FILE"
        echo "✅ 配置已添加到 server { 块内"
    else
        echo "❌ 无法找到插入位置"
        exit 1
    fi
fi

# 清理临时文件
rm -f /tmp/nginx_fix_block.conf

echo "🧪 测试Nginx配置..."
/www/server/nginx/sbin/nginx -t 2>/dev/null || /usr/sbin/nginx -t 2>/dev/null || nginx -t

if [ $? -ne 0 ]; then
    echo "❌ 配置测试失败，恢复备份..."
    LATEST_BACKUP=$(ls -t ${CONF_FILE}.bak.* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$CONF_FILE"
        echo "✅ 已恢复备份"
    fi
    exit 1
fi

echo "🔄 重载Nginx..."
/www/server/nginx/sbin/nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Nginx已重载"
else
    echo "⚠️  Nginx重载失败，请手动执行: /www/server/nginx/sbin/nginx -s reload"
fi

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 请执行以下操作："
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "2. 硬刷新页面（Ctrl+F5）"
echo "3. 检查浏览器控制台是否还有错误"
