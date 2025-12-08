#!/bin/bash

# 修复端口问题 - 使用 3001 端口启动

cd /www/wwwroot/admin.xinghun.info

echo "修复端口问题..."

# 1. 停止当前进程
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

# 2. 检查端口 3000 被什么占用
echo "检查端口占用："
lsof -i:3000 | head -5

# 3. 使用 PORT=3001 启动应用
echo ""
echo "使用 PORT=3001 启动应用..."
pm2 start npm --name "sncrm" -- start -- -p 3001

# 或者使用环境变量方式
# PORT=3001 pm2 start npm --name "sncrm" -- start

# 等待启动
sleep 5

# 4. 检查状态
echo ""
echo "应用状态："
pm2 status | grep sncrm

# 5. 检查端口
echo ""
echo "检查端口 3001："
lsof -i:3001

# 6. 测试连接
echo ""
echo "测试连接："
curl -I http://localhost:3001 2>&1 | head -3

echo ""
echo "完成！"
