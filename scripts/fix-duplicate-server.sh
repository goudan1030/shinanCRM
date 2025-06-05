#!/bin/bash

# 查找所有包含服务器名称的配置文件
echo "查找包含服务器名称的配置文件..."
NGINX_CONF_DIR="/www/server/panel/vhost/nginx"
FOUND_FILES=$(grep -l "server_name.*crm.xinghun.info" ${NGINX_CONF_DIR}/*.conf 2>/dev/null || echo "")

# 显示找到的文件
echo "找到以下配置文件包含服务器名称 crm.xinghun.info:"
for file in $FOUND_FILES; do
  echo " - $file"
done

# 如果存在多个文件，除了crm.xinghun.info.conf之外，都重命名
if [ $(echo "$FOUND_FILES" | wc -w) -gt 1 ]; then
  echo "存在多个配置文件，进行清理..."
  
  for file in $FOUND_FILES; do
    # 如果不是我们需要的主配置文件，则备份并移除
    if [[ "$file" != "${NGINX_CONF_DIR}/crm.xinghun.info.conf" ]]; then
      echo "备份并重命名: $file"
      cp "$file" "${file}.bak.$(date +%Y%m%d%H%M%S)"
      
      # 将该配置中的server_name替换为其他名称
      sed -i "s/server_name.*crm.xinghun.info.*/server_name _disabled_duplicate;/" "$file"
    fi
  done
else
  echo "没有发现重复的配置文件，无需清理"
fi

# 检查Nginx配置
echo "检查Nginx配置..."
nginx -t

# 重启Nginx
echo "重启Nginx服务..."
/etc/init.d/nginx reload

echo "重复服务器名称问题已修复！" 