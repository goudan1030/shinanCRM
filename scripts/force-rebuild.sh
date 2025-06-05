#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "强制清除缓存并重新构建应用..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "停止应用..."
pm2 stop sncrm

echo "清除所有构建缓存..."
rm -rf .next/
rm -rf node_modules/.cache/
npm cache clean --force

echo "重新安装依赖..."
npm install

echo "重新构建应用..."
npm run build

if [ $? -eq 0 ]; then
    echo "构建成功！"
    
    echo "检查新构建的文件..."
    echo "=== 新的chunks文件 ==="
    find .next/static/chunks -name "main-app-*.js" | head -3
    find .next/static/chunks -name "*layout*.js" | head -3
    find .next/static/chunks/app -name "*.js" | head -5 2>/dev/null || echo "app目录下的chunks"
    
    echo ""
    echo "设置文件权限..."
    chown -R www:www .next/
    chmod -R 755 .next/
    
    echo "重启应用..."
    pm2 start sncrm
    
    # 等待应用启动
    sleep 5
    
    echo "测试新应用..."
    curl -I http://127.0.0.1:3001/ | head -1
    
    echo ""
    echo "=========================================="
    echo "重新构建完成！"
    echo "=========================================="
    echo "请完全清除浏览器缓存或使用无痕模式访问:"
    echo "http://crm.xinghun.info"
    echo ""
    echo "如果还有问题，请使用硬刷新 Ctrl+F5 (Windows) 或 Cmd+Shift+R (Mac)"
    
else
    echo "构建失败！"
    exit 1
fi
EOT

echo "强制重新构建完成" 