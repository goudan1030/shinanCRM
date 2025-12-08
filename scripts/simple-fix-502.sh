#!/bin/bash

# 简单修复 502 错误 - 不做任何配置修改

set -e

echo "=========================================="
echo "修复 502 错误（不修改配置）"
echo "=========================================="
echo ""

cd /www/wwwroot/admin.xinghun.info

# 1. 检查构建文件
echo "检查构建文件..."
if [ ! -f ".next/BUILD_ID" ]; then
    echo "构建文件不存在，正在重新构建..."
    rm -rf .next
    export NODE_OPTIONS="--max-old-space-size=2048"
    npm run build
    echo "构建完成"
else
    echo "构建文件存在，跳过构建"
fi

# 2. 检查 PM2 进程
echo ""
echo "检查 PM2 进程..."
pm2 status

# 3. 重启应用（使用现有配置）
echo ""
echo "重启应用..."
pm2 restart sncrm || pm2 start npm --name "sncrm" -- start

# 4. 等待启动
sleep 5

# 5. 检查状态
echo ""
echo "应用状态："
pm2 status | grep sncrm

# 6. 测试连接
echo ""
echo "测试本地连接..."
curl -I http://localhost:3001 2>/dev/null || echo "连接失败，请检查日志"

# 7. 显示日志
echo ""
echo "最近的应用日志："
pm2 logs sncrm --lines 10 --nostream

echo ""
echo "完成！如果还是502，请检查："
echo "  pm2 logs sncrm --lines 50"
echo "  tail -50 /www/wwwlogs/admin.xinghun.info.error.log"
