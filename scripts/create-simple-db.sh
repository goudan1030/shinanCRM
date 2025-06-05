#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "创建简单的本地数据库连接配置..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 创建本地SQLite数据库配置..."
cat > .env.local << 'EOF'
# 使用本地文件数据库（临时解决方案）
DATABASE_URL=file:./data/database.db
DB_TYPE=sqlite

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

echo "2. 创建数据目录..."
mkdir -p data
chown www:www data

echo "3. 设置文件权限..."
chown www:www .env.local
chmod 644 .env.local

echo "4. 显示配置..."
cat .env.local

echo "5. 检查代码是否支持SQLite..."
if grep -r "sqlite" src/ --include="*.ts" --include="*.js" | head -2; then
    echo "代码中包含SQLite支持"
else
    echo "代码中没有找到SQLite配置，恢复MySQL配置..."
    
    # 使用更宽松的MySQL配置
    cat > .env.local << 'EOF'
# MySQL配置 - 使用默认配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=test

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

echo "6. 重启应用..."
pm2 restart sncrm

sleep 5

echo "7. 检查应用状态..."
pm2 logs sncrm --lines 10 --nostream

echo "8. 测试网页响应..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login

echo ""
echo "=========================================="
echo "简单数据库配置完成！"
echo "=========================================="
echo "如果仍有问题，可能需要："
echo "1. 检查应用代码的数据库连接逻辑"
echo "2. 确认MySQL服务的具体配置"
echo "3. 创建正确的数据库用户权限"
EOT

echo "数据库配置创建完成" 