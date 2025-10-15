#!/bin/bash

# 快速检查关键日志脚本
echo "开始快速检查关键日志..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
echo "===== 检查最新的PM2日志错误 ====="
cd /www/wwwroot/sncrm
tail -n 200 ~/.pm2/logs/sncrm-error.log | grep -i -E "error|exception|fail"

echo -e "\n===== 检查最新的Nginx错误 ====="
tail -n 50 /www/wwwlogs/sncrm.error.log

echo -e "\n===== 检查登录相关路由文件 ====="
find /www/wwwroot/sncrm/src -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" | grep -i login | xargs ls -la

echo -e "\n===== 检查应用是否正在运行 ====="
ps aux | grep node | grep -v grep

echo -e "\n===== 检查端口监听状态 ====="
netstat -tulpn | grep 3001
EOT

echo "快速日志检查完成。" 