#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修改数据库配置为socket连接..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 测试socket连接..."
mysql -u root --socket=/tmp/mysql.sock -e "SHOW DATABASES;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "root用户socket连接成功！"
    
    echo "2. 创建数据库和用户..."
    mysql -u root --socket=/tmp/mysql.sock << 'MYSQL_SCRIPT'
    
-- 创建数据库
CREATE DATABASE IF NOT EXISTS h5_cloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（如果不存在）
CREATE USER IF NOT EXISTS 'h5_cloud_user'@'localhost' IDENTIFIED BY 'z3Mzv3PePJPu3Q5w';

-- 授予权限
GRANT ALL PRIVILEGES ON h5_cloud_db.* TO 'h5_cloud_user'@'localhost';
FLUSH PRIVILEGES;

-- 显示结果
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'h5_cloud_user';
SHOW GRANTS FOR 'h5_cloud_user'@'localhost';

MYSQL_SCRIPT

    echo "3. 测试新用户连接..."
    mysql -u h5_cloud_user -pz3Mzv3PePJPu3Q5w --socket=/tmp/mysql.sock -e "SELECT 'Connection successful!' as result;"
    
    if [ $? -eq 0 ]; then
        echo "用户连接成功！"
        
        echo "4. 修改应用配置为socket连接..."
        cat > .env.local << 'EOF'
# 数据库配置 - 使用socket连接
DB_HOST=localhost
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=z3Mzv3PePJPu3Q5w
DB_NAME=h5_cloud_db
DB_SOCKET_PATH=/tmp/mysql.sock

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
    else
        echo "用户连接失败，使用root用户..."
        cat > .env.local << 'EOF'
# 数据库配置 - 使用root用户
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=h5_cloud_db
DB_SOCKET_PATH=/tmp/mysql.sock

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
else
    echo "socket连接失败，尝试其他方法..."
    # 保持原配置不变
fi

echo "5. 设置文件权限..."
chown www:www .env.local
chmod 644 .env.local

echo "6. 显示当前配置..."
cat .env.local

echo "7. 重启应用..."
pm2 restart sncrm

sleep 3

echo "8. 检查应用启动状态..."
pm2 logs sncrm --lines 15 --nostream

echo ""
echo "=========================================="
echo "数据库socket连接配置完成！"
echo "=========================================="
EOT

echo "数据库配置修复完成" 