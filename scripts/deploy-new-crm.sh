#!/bin/bash

# 部署新CRM系统的脚本
echo "开始部署新CRM系统..."

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 确认新系统构建成功
if [ ! -f /www/wwwroot/sncrm_new/build_success ]; then
  echo "错误：新系统尚未成功构建。请先运行修复脚本。"
  exit 1
fi

# 执行部署脚本
echo "执行部署脚本..."
cd /www/wwwroot/sncrm_new
bash deploy.sh

# 检查部署状态
echo "检查部署状态..."
sleep 5
pm2 list
netstat -tulpn | grep 3001

# 测试系统可用性
echo "测试系统可用性..."
curl -s http://localhost:3001/ > /dev/null
if [ $? -eq 0 ]; then
  echo "系统已成功部署并可访问。"
else
  echo "警告：系统可能未正确启动，请检查日志。"
fi

# 检查Nginx配置
echo "检查Nginx配置..."
nginx -t
EOT

echo "部署命令已执行。"
echo "请访问 http://crm.xinghun.info 查看新系统。" 