#!/bin/bash

# 诊断 502 错误的脚本

echo "=========================================="
echo "诊断 502 错误"
echo "=========================================="
echo ""

cd /www/wwwroot/admin.xinghun.info

echo "1. PM2 进程状态："
pm2 status
echo ""

echo "2. 检查端口占用："
lsof -i:3001 2>/dev/null || echo "端口 3001 未被占用"
lsof -i:3002 2>/dev/null || echo "端口 3002 未被占用"
echo ""

echo "3. 检查构建文件："
if [ -f ".next/BUILD_ID" ]; then
    echo "✓ 构建文件存在"
    cat .next/BUILD_ID
else
    echo "✗ 构建文件不存在"
fi
echo ""

echo "4. 检查 package.json 中的启动脚本："
grep -A 2 '"start"' package.json
echo ""

echo "5. 尝试启动应用并查看实时日志："
echo "正在启动应用..."
pm2 delete sncrm 2>/dev/null || true
pm2 start npm --name "sncrm" -- start
sleep 3
echo ""

echo "6. 当前 PM2 状态："
pm2 status
echo ""

echo "7. 实时日志（最近20行）："
pm2 logs sncrm --lines 20 --nostream
echo ""

echo "8. 测试本地连接："
curl -I http://localhost:3001 2>&1 | head -5 || echo "连接失败"
echo ""

echo "9. 检查 Nginx 配置中的端口："
find /etc/nginx /www/server -name "*admin.xinghun.info*" 2>/dev/null | head -1 | xargs grep "proxy_pass" 2>/dev/null || echo "未找到配置"
echo ""

echo "诊断完成！"
