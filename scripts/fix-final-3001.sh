#!/bin/bash

# 最终修复：确保应用在 3001 端口启动（与 Nginx 配置一致）

set -e

cd /www/wwwroot/admin.xinghun.info

echo "=========================================="
echo "修复端口配置 - 使用 3001 端口"
echo "=========================================="
echo ""

# 1. 停止当前进程
echo "1. 停止当前进程..."
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

# 2. 修改 ecosystem.config.js 中的端口为 3001，进程名为 sncrm
echo "2. 更新 ecosystem.config.js..."
if [ -f "ecosystem.config.js" ]; then
    sed -i "s/PORT: 3002/PORT: 3001/g" ecosystem.config.js
    sed -i "s/name: 'sncrm-new'/name: 'sncrm'/g" ecosystem.config.js
    echo "✓ 已更新端口为 3001，进程名为 sncrm"
else
    echo "⚠️  ecosystem.config.js 不存在"
fi

# 3. 检查端口 3001 是否被占用
echo ""
echo "3. 检查端口 3001..."
if lsof -i:3001 > /dev/null 2>&1; then
    echo "⚠️  端口 3001 被占用："
    lsof -i:3001
    echo ""
    read -p "是否要停止占用端口的进程？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        OCCUPYING_PID=$(lsof -i:3001 2>/dev/null | tail -n +2 | awk '{print $2}' | head -1)
        if [ -n "$OCCUPYING_PID" ]; then
            kill $OCCUPYING_PID 2>/dev/null || true
            sleep 2
            echo "✓ 进程已停止"
        fi
    fi
else
    echo "✓ 端口 3001 可用"
fi

# 4. 使用 ecosystem.config.js 启动
echo ""
echo "4. 启动应用..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    PORT=3001 pm2 start npm --name "sncrm" -- start
fi

# 等待启动
sleep 5

# 5. 验证
echo ""
echo "5. 验证启动..."
pm2 status | grep sncrm
echo ""
echo "检查端口监听："
lsof -i:3001 | head -3 || echo "⚠️  端口未监听"
echo ""
echo "测试连接："
curl -I http://localhost:3001 2>&1 | head -3 || echo "⚠️  连接失败"

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "如果还有问题，请检查："
echo "  pm2 logs sncrm --lines 30"
