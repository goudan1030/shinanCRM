#!/bin/bash

# 服务器信息
SERVER_IP="121.41.65.220"
SERVER_USER="root"
REMOTE_PATH="/www/wwwroot/sncrm"

# 确保本地已经构建
echo "===== 在本地构建Next.js应用 ====="
npm run build

# 创建部署包
echo "===== 创建部署包 ====="
rm -rf deploy-package
mkdir -p deploy-package/.next
cp -r .next/static deploy-package/.next/
cp -r .next/standalone/* deploy-package/
cp -r public deploy-package/
cp scripts/nginx-sncrm.conf deploy-package/
cp scripts/fix-deploy.sh deploy-package/

# 将部署包压缩
echo "===== 压缩部署包 ====="
cd deploy-package
tar -czvf ../sncrm-deploy.tar.gz .
cd ..

# 上传到服务器
echo "===== 上传到服务器 ====="
scp sncrm-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# 在服务器上执行部署
echo "===== 在服务器上执行部署 ====="
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 停止当前应用
pm2 delete sncrm || true

# 解压部署包
mkdir -p /tmp/sncrm-deploy
tar -xzvf /tmp/sncrm-deploy.tar.gz -C /tmp/sncrm-deploy

# 复制文件到部署目录
mkdir -p /www/wwwroot/sncrm/.next
cp -r /tmp/sncrm-deploy/.next/static /www/wwwroot/sncrm/.next/
cp -r /tmp/sncrm-deploy/* /www/wwwroot/sncrm/

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

# 删除本地临时文件
rm -rf deploy-package
rm -f sncrm-deploy.tar.gz

echo "===== 部署完成 ====="
echo "请访问 http://crm.xinghun.info 检查网站是否正常运行" 