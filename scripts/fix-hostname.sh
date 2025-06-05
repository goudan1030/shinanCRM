#!/bin/bash

# 这个脚本用于修复主机名解析问题
# 问题：应用无法解析主机名 iZbp18aua0oiex6942sg6vZ

# 连接到服务器
ssh root@8.149.244.105 << 'EOT'
# 检查/etc/hosts文件
echo "检查并修改/etc/hosts文件..."
if ! grep -q "iZbp18aua0oiex6942sg6vZ" /etc/hosts; then
  # 添加主机名到本地hosts文件
  echo "127.0.0.1 iZbp18aua0oiex6942sg6vZ" >> /etc/hosts
  echo "添加主机名映射成功"
else
  echo "主机名映射已存在"
fi

# 重启应用
echo "重启应用..."
pm2 restart sncrm

# 等待应用启动
sleep 5

# 检查应用状态
pm2 list

# 测试API是否可用
echo "测试API..."
curl -s http://127.0.0.1:3001/api/auth/session || echo "API请求失败"

echo "修复完成，请访问 http://crm.xinghun.info 测试登录功能"
EOT 