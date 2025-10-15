#!/bin/bash

# 验证登录修复是否成功的脚本
echo "开始验证登录修复..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行验证命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
echo "===== 验证 Nginx 配置 ====="
grep -A 10 "location / {" /www/server/panel/vhost/nginx/crm.xinghun.info.conf

echo -e "\n===== 验证登录接口 ====="
if [ -f "/www/wwwroot/sncrm/src/app/api/auth/login/route.ts" ]; then
  echo "登录接口文件存在"
  head -n 20 /www/wwwroot/sncrm/src/app/api/auth/login/route.ts
else
  echo "错误: 登录接口文件不存在"
fi

echo -e "\n===== 验证静态页面 ====="
if [ -f "/www/wwwroot/sncrm/public/login/index.html" ]; then
  echo "登录页面文件存在"
else
  echo "错误: 登录页面文件不存在"
fi

if [ -f "/www/wwwroot/sncrm/public/dashboard/index.html" ]; then
  echo "仪表盘页面文件存在"
else
  echo "错误: 仪表盘页面文件不存在"
fi

echo -e "\n===== 验证应用状态 ====="
pm2 status sncrm

echo -e "\n===== 验证页面访问 ====="
# 使用curl测试登录页面
echo "测试访问登录页面..."
curl -s -I http://localhost:3001/login | head -n 1

# 使用curl测试登录API
echo "测试登录API..."
curl -s -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}' http://localhost:3001/api/auth/login | grep -o '"success":true'

echo -e "\n===== 验证完成 ====="
EOT

echo "验证脚本执行完毕。请通过浏览器访问 http://crm.xinghun.info 测试登录流程。"
echo "登录后，系统应将您重定向到仪表盘页面。"
echo "如果仍有问题，请尝试清除浏览器缓存和Cookie后再次测试。" 