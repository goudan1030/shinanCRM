#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复数据库访问权限问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'

echo "1. 测试当前数据库连接..."
mysql -u h5_cloud_user -pz3Mzv3PePJPu3Q5w -h 8.149.244.105 -e "SELECT 1;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "数据库连接成功！"
    exit 0
else
    echo "数据库连接失败，开始修复权限..."
fi

echo "2. 检查数据库用户是否存在..."
# 使用root用户登录MySQL修复权限
mysql -u root -p123456 << 'MYSQL_SCRIPT'

-- 显示当前的h5_cloud_user权限
SELECT User, Host FROM mysql.user WHERE User = 'h5_cloud_user';

-- 如果用户不存在，创建用户
CREATE USER IF NOT EXISTS 'h5_cloud_user'@'%' IDENTIFIED BY 'z3Mzv3PePJPu3Q5w';
CREATE USER IF NOT EXISTS 'h5_cloud_user'@'localhost' IDENTIFIED BY 'z3Mzv3PePJPu3Q5w';
CREATE USER IF NOT EXISTS 'h5_cloud_user'@'8.149.244.105' IDENTIFIED BY 'z3Mzv3PePJPu3Q5w';

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS h5_cloud_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 授予所有权限
GRANT ALL PRIVILEGES ON h5_cloud_db.* TO 'h5_cloud_user'@'%';
GRANT ALL PRIVILEGES ON h5_cloud_db.* TO 'h5_cloud_user'@'localhost';
GRANT ALL PRIVILEGES ON h5_cloud_db.* TO 'h5_cloud_user'@'8.149.244.105';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示授权结果
SHOW GRANTS FOR 'h5_cloud_user'@'%';
SELECT User, Host FROM mysql.user WHERE User = 'h5_cloud_user';

MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    echo "3. 数据库权限修复成功！"
else
    echo "3. 数据库权限修复失败，可能root密码不正确"
    echo "   请手动执行以下SQL命令："
    echo "   CREATE USER 'h5_cloud_user'@'%' IDENTIFIED BY 'z3Mzv3PePJPu3Q5w';"
    echo "   GRANT ALL PRIVILEGES ON h5_cloud_db.* TO 'h5_cloud_user'@'%';"
    echo "   FLUSH PRIVILEGES;"
fi

echo "4. 再次测试数据库连接..."
mysql -u h5_cloud_user -pz3Mzv3PePJPu3Q5w -h 8.149.244.105 -e "SELECT 'Connection successful!' as result;"

echo "5. 重启CRM应用..."
cd /www/wwwroot/sncrm
pm2 restart sncrm

sleep 3

echo "6. 检查应用日志..."
pm2 logs sncrm --lines 10 --nostream

echo ""
echo "=========================================="
echo "数据库访问权限修复完成！"
echo "=========================================="
EOT

echo "数据库权限修复完成" 