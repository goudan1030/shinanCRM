#!/bin/bash

# 修复环境变量并启动应用
echo "修复环境变量并启动应用..."

ssh root@8.149.244.105 << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 恢复MySQL数据库配置..."
cat > .env.local << 'EOF'
# 数据库配置
DB_HOST=8.149.244.105
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=z3Mzv3PePJPu3Q5w
DB_NAME=h5_cloud_db

# JWT配置
JWT_SECRET=very-secure-jwt-secret-key-for-crm-system

# Next.js配置
NEXTAUTH_URL=http://crm.xinghun.info
NEXTAUTH_SECRET=next-auth-secret-key-for-session

# Cookie配置
COOKIE_NAME=auth_token
COOKIE_SECURE=false
COOKIE_DOMAIN=crm.xinghun.info
COOKIE_PATH=/

# 应用配置
NODE_ENV=production
PORT=3001
EOF

echo "2. 设置文件权限..."
chown www:www .env.local
chmod 644 .env.local

echo "3. 显示配置内容..."
cat .env.local

echo "4. 使用环境变量启动应用..."
PORT=3001 pm2 start npm --name "sncrm" -- start

sleep 5

echo "5. 检查应用状态..."
pm2 status

echo "6. 检查应用日志..."
pm2 logs sncrm --lines 5 --nostream

echo "7. 测试应用响应..."
curl -I http://localhost:3001/login

EOT

echo "环境变量修复和应用启动完成" 