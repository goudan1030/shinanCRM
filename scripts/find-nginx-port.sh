#!/bin/bash

# 查找 Nginx 配置中的实际端口

echo "查找 Nginx 配置中的端口..."

# 查找所有可能的配置文件
CONFIG_FILES=(
    "/www/server/panel/vhost/nginx/admin.xinghun.info.conf"
    "/etc/nginx/sites-enabled/admin.xinghun.info"
    "/etc/nginx/conf.d/admin.xinghun.info.conf"
    "/www/server/nginx/conf/vhost/admin.xinghun.info.conf"
)

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        echo ""
        echo "找到配置文件: $config_file"
        echo "proxy_pass 配置："
        grep "proxy_pass" "$config_file" | grep -v "^#" | head -3
        echo ""
        echo "完整配置内容："
        cat "$config_file"
        break
    fi
done

# 如果没找到，搜索所有包含 admin.xinghun.info 的配置
if [ ! -f "$config_file" ]; then
    echo ""
    echo "在标准位置未找到，搜索所有配置..."
    find /www/server/panel/vhost/nginx -name "*.conf" -exec grep -l "admin.xinghun.info" {} \; 2>/dev/null | head -1 | while read file; do
        echo "找到: $file"
        grep "proxy_pass" "$file" | grep -v "^#"
    done
fi
