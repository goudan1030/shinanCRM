#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "正在检查登录问题修复情况..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 检查Nginx配置
echo "检查Nginx配置..."
nginx -t

# 检查应用状态
echo "检查应用状态..."
pm2 status

# 检查日志
echo "检查最近的应用日志..."
pm2 logs --lines 20 sncrm

# 检查权限
echo "检查文件权限..."
ls -la /www/wwwroot/sncrm/pages/

# 检查Cookie设置
echo "检查cookies设置代码..."
grep -r "setCookie" --include="*.ts" --include="*.js" .

# 检查重定向逻辑
echo "检查重定向逻辑..."
grep -r "router.push" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" .

# 检查服务器状态
echo "检查服务器状态..."
free -h
df -h
EOT

echo "检查完成，请尝试访问 http://crm.xinghun.info 并测试登录功能。"
echo "如果登录后仍然无法正确跳转，请检查浏览器控制台是否有错误信息。" 