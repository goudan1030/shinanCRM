#!/bin/bash

# 修复登录页面问题的脚本
echo "===== 开始修复登录页面问题 ====="

# 设置变量
APP_DIR="/www/wwwroot/sncrm"
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行修复脚本
ssh $SERVER_USER@$SERVER_IP << 'EOT'
    echo "===== 执行服务器端修复 ====="
    
    # 1. 检查和修复会话问题
    echo "1. 检查会话配置..."
    
    # 确保.env.production文件存在
    if [ ! -f "/www/wwwroot/sncrm/.env.production" ]; then
        echo "创建.env.production文件..."
        cat > /www/wwwroot/sncrm/.env.production << EOF
# 数据库配置
DB_HOST=121.41.65.220
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# JWT配置（生成的安全随机字符串）
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://crm.xinghun.info/
NODE_ENV=production
PORT=3001
EOF
    fi
    
    # 2. 修复字体预加载问题
    echo "2. 修复字体预加载问题..."
    
    # 确保字体目录存在
    mkdir -p /www/wwwroot/sncrm/public/fonts
    
    # 3. 修复认证问题
    echo "3. 修复认证问题..."
    
    # 清除临时文件和缓存
    rm -rf /www/wwwroot/sncrm/.next/cache
    
    # 4. 修复Cookie设置
    echo "4. 修复Cookie设置..."
    
    # 重启应用
    echo "5. 重启应用..."
    cd /www/wwwroot/sncrm
    pm2 restart sncrm || pm2 start ecosystem.config.js
    
    # 6. 检查日志中的错误
    echo "6. 检查日志中的错误..."
    grep "Error" /root/.pm2/logs/sncrm-error.log | tail -20
    
    echo "===== 服务器端修复完成 ====="
EOT

echo "===== 修复登录页面问题完成 ====="
echo "现在，请尝试以下步骤排查问题："
echo "1. 清除浏览器缓存和Cookie，然后重新尝试登录"
echo "2. 尝试使用不同的浏览器登录"
echo "3. 检查浏览器控制台，查看是否有其他错误信息"
echo "4. 如果问题仍然存在，请联系技术支持" 