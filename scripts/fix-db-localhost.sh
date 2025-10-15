#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "修改数据库配置为localhost连接..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 备份当前配置..."
cp .env.local .env.local.backup

echo "2. 修改数据库配置为localhost..."
cat > .env.local << 'EOF'
# 数据库配置 - 使用localhost连接
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
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

echo "3. 测试root用户数据库连接..."
mysql -u root -e "SHOW DATABASES;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "root用户无密码连接成功"
    
    echo "4. 创建/确保数据库存在..."
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS h5_cloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
else
    echo "root用户无密码连接失败，尝试其他配置..."
    
    # 尝试使用原来的h5_cloud_user但连接localhost
    cat > .env.local << 'EOF'
# 数据库配置 - 使用localhost连接
DB_HOST=localhost
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
fi

echo "5. 设置文件权限..."
chown www:www .env.local
chmod 644 .env.local

echo "6. 显示新配置..."
cat .env.local

echo "7. 重启应用..."
pm2 restart sncrm

sleep 3

echo "8. 检查应用日志..."
pm2 logs sncrm --lines 5 --nostream

echo ""
echo "=========================================="
echo "数据库配置修改完成！"
echo "=========================================="
echo "如果还有问题，请检查MySQL服务状态："
echo "systemctl status mysql"
EOT

echo "数据库配置修改完成" 