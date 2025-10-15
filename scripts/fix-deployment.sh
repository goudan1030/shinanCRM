#!/bin/bash

# 打印执行的命令
set -x

# 设置目录路径
DEPLOY_DIR="/www/wwwroot/sncrm"
LOG_DIR="/tmp/sncrm-fix-logs"
CURRENT_TIME=$(date "+%Y%m%d%H%M%S")

# 创建日志目录
mkdir -p $LOG_DIR

# 停止当前应用
echo "===== 停止应用 ====="
ssh root@121.41.65.220 "pm2 delete sncrm || true"

# 备份当前目录
echo "===== 备份当前应用 ====="
ssh root@121.41.65.220 "cp -r $DEPLOY_DIR ${DEPLOY_DIR}_backup_${CURRENT_TIME}"

# 重新构建应用
echo "===== 重新构建应用 ====="
npm run build > $LOG_DIR/build_${CURRENT_TIME}.log 2>&1

# 创建部署包
echo "===== 创建部署包 ====="
rm -rf deploy-package
mkdir -p deploy-package/.next
cp -r .next/static deploy-package/.next/
cp -r .next/standalone/* deploy-package/
cp -r public deploy-package/
cp scripts/nginx-sncrm.conf deploy-package/

# 打包
echo "===== 打包文件 ====="
cd deploy-package && tar -czvf ../sncrm-deploy.tar.gz . && cd ..

# 上传到服务器
echo "===== 上传到服务器 ====="
scp sncrm-deploy.tar.gz root@121.41.65.220:/tmp/

# 清空目标目录（保留部分文件）
echo "===== 在服务器上执行部署 ====="
ssh root@121.41.65.220 << 'EOT'
# 清空目标目录，但保留上传目录
mkdir -p /tmp/sncrm-deploy
tar -xzvf /tmp/sncrm-deploy.tar.gz -C /tmp/sncrm-deploy

# 备份上传目录
if [ -d /www/wwwroot/sncrm/public/uploads ]; then
  mkdir -p /tmp/sncrm-deploy/public/
  cp -r /www/wwwroot/sncrm/public/uploads /tmp/sncrm-deploy/public/
fi

# 删除旧文件
rm -rf /www/wwwroot/sncrm/*
rm -rf /www/wwwroot/sncrm/.[!.]*

# 复制新文件
cp -r /tmp/sncrm-deploy/* /www/wwwroot/sncrm/
cp -r /tmp/sncrm-deploy/.* /www/wwwroot/sncrm/ 2>/dev/null || true

# 设置文件权限
chmod -R 755 /www/wwwroot/sncrm
chown -R www:www /www/wwwroot/sncrm

# 更新Nginx配置
cp /tmp/sncrm-deploy/nginx-sncrm.conf /www/server/panel/vhost/nginx/sncrm.conf
/etc/init.d/nginx restart

# 启动应用
cd /www/wwwroot/sncrm
NODE_ENV=production PORT=3001 pm2 start server.js --name sncrm

# 清理临时文件
rm -rf /tmp/sncrm-deploy
rm -f /tmp/sncrm-deploy.tar.gz
EOT

# 清理本地临时文件
rm -rf deploy-package
rm -f sncrm-deploy.tar.gz

echo "===== 部署完成 ====="
echo "请访问 http://crm.xinghun.info 检查网站是否正常运行" 