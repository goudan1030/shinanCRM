#!/bin/bash

# 应用完整的Nginx配置

CONF_FILE="/www/server/panel/vhost/nginx/admin.xinghun.info.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 应用Nginx配置..."

# 备份
cp "$CONF_FILE" "${CONF_FILE}.bak.$(date +%Y%m%d_%H%M%S)"
echo "✅ 已备份原配置"

# 复制新配置
cp "$SCRIPT_DIR/nginx-admin-xinghun-info-complete.conf" "$CONF_FILE"
echo "✅ 配置已更新"

# 测试配置
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

# 重载Nginx
echo "🔄 重载Nginx..."
/www/server/nginx/sbin/nginx -s reload

if [ $? -eq 0 ]; then
    echo "✅ Nginx已重载"
    echo ""
    echo "✅ 修复完成！"
    echo ""
    echo "📝 请执行以下操作："
    echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
    echo "2. 硬刷新页面（Ctrl+F5）"
    echo "3. 检查浏览器控制台是否还有错误"
else
    echo "❌ Nginx重载失败"
    exit 1
fi
