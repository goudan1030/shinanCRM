#!/bin/bash

# 确保Next.js应用已经构建
echo "===== 重新构建Next.js应用 ====="
npm run build

# 设置正确的部署目录
DEPLOY_DIR="/www/wwwroot/sncrm"

# 停止当前运行的应用
echo "===== 停止当前应用 ====="
pm2 delete sncrm || true

# 复制Next.js构建文件到部署目录
echo "===== 复制应用文件 ====="
mkdir -p $DEPLOY_DIR/.next
cp -r .next/static $DEPLOY_DIR/.next/
cp -r .next/standalone/* $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/

# 确保有正确的访问权限
echo "===== 设置文件权限 ====="
chmod -R 755 $DEPLOY_DIR
chown -R www:www $DEPLOY_DIR

# 更新Nginx配置
echo "===== 更新Nginx配置 ====="
cp scripts/nginx-sncrm.conf /www/server/panel/vhost/nginx/sncrm.conf

# 重启Nginx
echo "===== 重启Nginx ====="
/etc/init.d/nginx restart

# 启动应用
echo "===== 启动应用 ====="
cd $DEPLOY_DIR
NODE_ENV=production PORT=3001 pm2 start server.js --name sncrm

echo "===== 部署修复完成 ====="
echo "请现在访问 http://crm.xinghun.info 检查问题是否解决" 