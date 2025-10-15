#!/bin/bash

# 系统日志检查脚本
echo "开始检查系统日志和错误信息..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
echo "===== 检查应用运行状态 ====="
pm2 info sncrm

echo -e "\n===== 检查应用日志 ====="
pm2 logs sncrm --lines 100 | grep -i -E "error|warn|exception|failed"

echo -e "\n===== 检查Nginx错误日志 ====="
tail -n 100 /www/wwwlogs/sncrm.error.log

echo -e "\n===== 检查系统日志 ====="
tail -n 50 /var/log/messages

echo -e "\n===== 检查应用配置 ====="
cd /www/wwwroot/sncrm
echo "1. 检查环境变量文件:"
ls -la .env*
cat .env.local 2>/dev/null || echo "没有找到.env.local文件"
echo -e "\n2. 检查Next.js配置:"
cat next.config.js
echo -e "\n3. 检查当前middleware.ts文件:"
cat middleware.ts
echo -e "\n4. 检查是否有运行中的Next.js进程:"
ps aux | grep next

echo -e "\n===== 检查登录API文件 ====="
ls -la src/app/api/auth/login/
cat src/app/api/auth/login/route.ts

echo -e "\n===== 检查网络连接状态 ====="
netstat -tulpn | grep 3001
EOT

echo "日志检查完成。" 