#!/bin/bash

# 详细检查登录相关日志的脚本
echo "开始详细检查登录相关日志..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 检查应用状态
echo "===== 检查应用状态 ====="
pm2 list
netstat -tulpn | grep 3001

# 检查Next.js应用日志
echo "===== 检查Next.js应用日志 ====="
tail -n 100 /www/wwwroot/sncrm/.pm2/logs/sncrm-out.log
echo ""
echo "===== 检查Next.js错误日志 ====="
tail -n 100 /www/wwwroot/sncrm/.pm2/logs/sncrm-error.log

# 检查API请求日志
echo "===== 检查Nginx访问日志 ====="
tail -n 50 /www/wwwlogs/sncrm.access.log | grep -E "POST /api/auth/login|GET /api/auth/session"
echo ""
echo "===== 检查Nginx错误日志 ====="
tail -n 50 /www/wwwlogs/sncrm.error.log

# 检查中间件和登录API
echo "===== 检查中间件文件 ====="
cat /www/wwwroot/sncrm/middleware.ts
echo ""
echo "===== 检查登录API ====="
cat /www/wwwroot/sncrm/pages/api/auth/login.ts
echo ""
echo "===== 检查会话API ====="
cat /www/wwwroot/sncrm/pages/api/auth/session.ts

# 检查cookie设置
echo "===== 检查Cookie设置 ====="
curl -I -X GET http://localhost:3001/api/auth/session

# 检查网络请求
echo "===== 模拟登录请求 ====="
curl -v -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c /tmp/cookies.txt

echo "===== 使用Cookie请求会话 ====="
curl -v -X GET http://localhost:3001/api/auth/session \
  -b /tmp/cookies.txt

echo "详细日志检查完成。"
EOT

echo "登录相关日志检查完成。" 