#!/bin/bash

# 最终的修复脚本 - 使用编译好的standalone模式

# 连接到服务器
ssh root@121.41.65.220 << 'EOT'
# 停止当前应用
echo "===== 停止当前应用 ====="
pm2 stop sncrm || true
pm2 delete sncrm || true

# 检查并确保环境变量文件存在
echo "===== 创建环境变量文件 ====="
cat > /www/wwwroot/sncrm/.env << 'EOFENV'
# 数据库配置
DB_HOST=121.41.65.220
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# 认证配置
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe
NEXTAUTH_URL=http://crm.xinghun.info
NEXTAUTH_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://121.41.65.220:8888/
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
EOFENV

# 确保主机名解析正确
echo "===== 设置主机名解析 ====="
if ! grep -q "iZbp18aua0oiex6942sg6vZ" /etc/hosts; then
  echo "127.0.0.1 iZbp18aua0oiex6942sg6vZ" >> /etc/hosts
fi
if ! grep -q "localhost" /etc/hosts; then
  echo "127.0.0.1 localhost" >> /etc/hosts
fi

# 确保目录结构正确
echo "===== 确保目录结构 ====="
cd /www/wwwroot/sncrm
ln -sf .next _next

# 直接使用编译好的server.js文件
echo "===== 启动应用 ====="
cd /www/wwwroot/sncrm
NODE_ENV=production PORT=3001 pm2 start .next/standalone/server.js --name sncrm

# 等待应用启动
sleep 5

# 检查应用状态
pm2 list

echo "修复完成，请访问 http://crm.xinghun.info 测试登录功能"
EOT 