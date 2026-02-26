#!/bin/bash

echo "🔍 开始调试中间件认证问题..."
echo "=================================="

# 检查当前应用状态
echo "📊 检查PM2应用状态:"
pm2 list | grep sncrm-new

echo ""
echo "🧪 测试企业微信API访问..."

# 在后台启动日志监控
echo "📝 启动PM2日志监控 (后台运行)..."
pm2 logs sncrm-new --lines 50 > /tmp/middleware-debug.log 2>&1 &
LOG_PID=$!

# 等待1秒确保日志监控启动
sleep 1

echo "🌐 测试API端点访问..."
echo "测试1: /api/wecom/test-auth"
curl -s -w "\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
     http://localhost:3002/api/wecom/test-auth

echo ""
echo "测试2: /api/wecom/manual-check"  
curl -s -w "\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
     http://localhost:3002/api/wecom/manual-check

echo ""
echo "测试3: /api/wecom/config"
curl -s -w "\nHTTP状态码: %{http_code}\n响应时间: %{time_total}s\n" \
     http://localhost:3002/api/wecom/config

# 等待3秒收集日志
sleep 3

# 停止日志监控
kill $LOG_PID 2>/dev/null

echo ""
echo "📄 中间件调试日志输出:"
echo "=================================="
if [ -f "/tmp/middleware-debug.log" ]; then
    grep -E "(中间件处理路径|企业微信API路径检查|API路径公开检查结果|API路径为公开路径)" /tmp/middleware-debug.log || echo "没有找到预期的调试日志"
    
    echo ""
    echo "📄 完整日志 (最近50行):"
    tail -50 /tmp/middleware-debug.log
else
    echo "日志文件不存在"
fi

echo ""
echo "🔧 检查middleware配置..."
echo "公开路由配置:"
grep -A 15 "publicRoutes = \[" middleware.ts | head -20

echo ""
echo "✅ 调试完成。"
echo "如果API仍然返回401，说明middleware配置有问题。" 