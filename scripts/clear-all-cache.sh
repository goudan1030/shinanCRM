#!/bin/bash

# 彻底清除所有缓存的脚本

echo "=== 清除所有缓存 ==="

# 连接到服务器并执行清理操作
ssh root@121.41.65.220 << 'EOF'
echo "1. 停止应用..."
cd /www/wwwroot/sncrm
pm2 stop all

echo "2. 清除 Next.js 缓存..."
rm -rf .next/cache
rm -rf .next/static/chunks/pages
rm -rf .next/server/pages

echo "3. 清除 nginx 缓存..."
rm -rf /tmp/nginx_cache/*
rm -rf /var/cache/nginx/*

echo "4. 清除系统缓存..."
sync
echo 3 > /proc/sys/vm/drop_caches

echo "5. 重新构建应用..."
npm run build

echo "6. 重启 nginx..."
nginx -s reload

echo "7. 启动应用..."
pm2 start ecosystem.config.js --env production

echo "8. 显示应用状态..."
pm2 status

echo "9. 检查新的静态文件..."
ls -la .next/static/chunks/ | grep -E "(main-app|error|5565|layout)" | head -5

echo "完成！"
EOF

echo "=== 缓存清除完成，请等待30秒后刷新浏览器 ===" 