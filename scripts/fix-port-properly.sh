#!/bin/bash

# 专业修复端口问题 - 检查占用并正确配置

set -e

cd /www/wwwroot/admin.xinghun.info

echo "=========================================="
echo "专业端口问题诊断和修复"
echo "=========================================="
echo ""

# 1. 检查端口 3000 被什么占用
echo "1. 检查端口 3000 占用情况："
PORT_3000_PROCESS=$(lsof -i:3000 2>/dev/null | tail -n +2 | head -1)
if [ -n "$PORT_3000_PROCESS" ]; then
    echo "端口 3000 被占用："
    echo "$PORT_3000_PROCESS"
    PID_3000=$(echo "$PORT_3000_PROCESS" | awk '{print $2}')
    echo "进程 PID: $PID_3000"
    echo "进程详情："
    ps -p $PID_3000 -o pid,cmd --no-headers 2>/dev/null || echo "进程可能已结束"
else
    echo "端口 3000 未被占用"
fi

echo ""

# 2. 检查端口 3001 占用情况
echo "2. 检查端口 3001 占用情况："
PORT_3001_PROCESS=$(lsof -i:3001 2>/dev/null | tail -n +2 | head -1)
if [ -n "$PORT_3001_PROCESS" ]; then
    echo "端口 3001 被占用："
    echo "$PORT_3001_PROCESS"
else
    echo "端口 3001 未被占用"
fi

echo ""

# 3. 检查 Nginx 配置中的端口
echo "3. 检查 Nginx 配置中的端口："
NGINX_CONFIG=$(find /etc/nginx /www/server -name "*admin.xinghun.info*" 2>/dev/null | head -1)
if [ -n "$NGINX_CONFIG" ]; then
    echo "找到 Nginx 配置: $NGINX_CONFIG"
    NGINX_PORT=$(grep -o "proxy_pass.*:[0-9]*" "$NGINX_CONFIG" | grep -o "[0-9]*" | head -1)
    echo "Nginx 配置的端口: $NGINX_PORT"
else
    echo "未找到 Nginx 配置文件"
fi

echo ""

# 4. 检查环境变量和配置文件
echo "4. 检查应用配置："
if [ -f ".env.local" ]; then
    ENV_PORT=$(grep "^PORT=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "")
    echo ".env.local 中的 PORT: ${ENV_PORT:-未设置}"
fi

if [ -f ".env" ]; then
    ENV_PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "")
    echo ".env 中的 PORT: ${ENV_PORT:-未设置}"
fi

if [ -f "ecosystem.config.js" ]; then
    ECOSYSTEM_PORT=$(grep -o "PORT.*[0-9]*" ecosystem.config.js | grep -o "[0-9]*" | head -1)
    echo "ecosystem.config.js 中的 PORT: ${ECOSYSTEM_PORT:-未设置}"
fi

echo ""

# 5. 确定应该使用的端口
echo "5. 确定应该使用的端口："
if [ -n "$NGINX_PORT" ]; then
    TARGET_PORT=$NGINX_PORT
    echo "根据 Nginx 配置，应该使用端口: $TARGET_PORT"
elif [ -n "$ECOSYSTEM_PORT" ]; then
    TARGET_PORT=$ECOSYSTEM_PORT
    echo "根据 ecosystem.config.js，应该使用端口: $TARGET_PORT"
else
    TARGET_PORT=3001
    echo "使用默认端口: $TARGET_PORT"
fi

echo ""

# 6. 检查目标端口是否被占用
echo "6. 检查目标端口 $TARGET_PORT 是否可用："
if lsof -i:$TARGET_PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $TARGET_PORT 已被占用："
    lsof -i:$TARGET_PORT
    echo ""
    echo "占用端口的进程："
    OCCUPYING_PID=$(lsof -i:$TARGET_PORT 2>/dev/null | tail -n +2 | awk '{print $2}' | head -1)
    if [ -n "$OCCUPYING_PID" ]; then
        ps -p $OCCUPYING_PID -o pid,cmd --no-headers
        echo ""
        read -p "是否要停止占用端口的进程？(y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill $OCCUPYING_PID 2>/dev/null || true
            sleep 2
            echo "进程已停止"
        fi
    fi
else
    echo "✓ 端口 $TARGET_PORT 可用"
fi

echo ""

# 7. 停止当前 sncrm 进程
echo "7. 停止当前 sncrm 进程："
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

echo ""

# 8. 使用正确的端口启动
echo "8. 使用端口 $TARGET_PORT 启动应用："
PORT=$TARGET_PORT pm2 start npm --name "sncrm" -- start

# 等待启动
sleep 5

echo ""

# 9. 验证
echo "9. 验证启动："
pm2 status | grep sncrm
echo ""
echo "检查端口监听："
lsof -i:$TARGET_PORT | head -3 || echo "端口未监听"
echo ""
echo "测试连接："
curl -I http://localhost:$TARGET_PORT 2>&1 | head -3 || echo "连接失败"

echo ""
echo "=========================================="
echo "完成！"
echo "=========================================="
echo ""
echo "如果还有问题，请检查："
echo "  - Nginx 配置中的 proxy_pass 端口是否与 $TARGET_PORT 一致"
echo "  - pm2 logs sncrm 查看详细日志"
