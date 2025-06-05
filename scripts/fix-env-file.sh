#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复.env.local文件，添加缺失的数据库配置..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "更新.env.local文件..."
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

echo "设置文件权限..."
chown www:www .env.local
chmod 644 .env.local

echo "验证.env.local文件内容..."
cat .env.local

echo ""
echo "重启应用以加载新的环境变量..."
pm2 restart sncrm

sleep 3

echo "检查应用日志..."
pm2 logs sncrm --lines 10 --nostream

echo ""
echo "=========================================="
echo "环境变量配置修复完成！"
echo "=========================================="
echo "现在应该不会再出现'找不到.env.local文件'的警告了"
EOT

echo "环境变量修复完成" 