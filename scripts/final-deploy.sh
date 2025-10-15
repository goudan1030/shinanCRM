#!/bin/bash

# 设置目录路径
DEPLOY_DIR="/www/wwwroot/sncrm"
SERVER_USER="root"
SERVER_IP="121.41.65.220"

echo "===== 重新构建Next.js应用 ====="
npm run build

echo "===== 创建部署包 ====="
rm -rf deploy-package
mkdir -p deploy-package

# 复制构建文件和静态资源
cp -r .next deploy-package/
cp -r public deploy-package/
cp package.json deploy-package/
cp -r node_modules deploy-package/next

# 创建自定义index.html文件
cat > deploy-package/index.html << EOF
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SNCRM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=/login">
</head>
<body>
  <p>重定向到登录页面...</p>
</body>
</html>
EOF

# 创建Nginx配置
cat > deploy-package/nginx-sncrm.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info 121.41.65.220;
    root /www/wwwroot/sncrm;
    index index.html index.htm;

    # 静态HTML和资源文件
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API请求代理到Node.js应用
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 登录页面
    location /login {
        proxy_pass http://127.0.0.1:3001/login;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js静态资源
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri $uri/ =404;
    }

    # 其他静态资源
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files $uri $uri/ =404;
    }

    # 日志配置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF

# 创建部署脚本
cat > deploy-package/deploy.sh << 'EOF'
#!/bin/bash

# 停止当前应用
pm2 delete sncrm || true

# 设置部署目录
DEPLOY_DIR="/www/wwwroot/sncrm"

# 备份上传目录
if [ -d $DEPLOY_DIR/public/uploads ]; then
  mkdir -p /tmp/sncrm-backup
  cp -r $DEPLOY_DIR/public/uploads /tmp/sncrm-backup/
fi

# 清空当前目录
find $DEPLOY_DIR -mindepth 1 -not -name .user.ini -delete

# 复制文件
cp -r * $DEPLOY_DIR/
cp -r .next $DEPLOY_DIR/

# 恢复上传目录
if [ -d /tmp/sncrm-backup/uploads ]; then
  mkdir -p $DEPLOY_DIR/public/
  cp -r /tmp/sncrm-backup/uploads $DEPLOY_DIR/public/
  rm -rf /tmp/sncrm-backup
fi

# 设置权限
chmod -R 755 $DEPLOY_DIR
chown -R www:www $DEPLOY_DIR

# 更新Nginx配置
cp nginx-sncrm.conf /www/server/panel/vhost/nginx/sncrm.conf
/etc/init.d/nginx restart

# 启动应用
cd $DEPLOY_DIR
NODE_ENV=production PORT=3001 pm2 start server.js --name sncrm

echo "部署完成，请访问 http://crm.xinghun.info 检查网站"
EOF

# 打包文件
cd deploy-package && tar -czvf ../sncrm-deploy.tar.gz . && cd ..

# 上传到服务器
echo "===== 上传到服务器 ====="
scp sncrm-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# 在服务器上执行部署
echo "===== 执行部署 ====="
ssh $SERVER_USER@$SERVER_IP << 'EOT'
mkdir -p /tmp/sncrm-deploy
tar -xzvf /tmp/sncrm-deploy.tar.gz -C /tmp/sncrm-deploy
cd /tmp/sncrm-deploy
chmod +x deploy.sh
./deploy.sh
rm -rf /tmp/sncrm-deploy
rm -f /tmp/sncrm-deploy.tar.gz
EOT

# 清理本地临时文件
rm -rf deploy-package
rm -f sncrm-deploy.tar.gz

echo "===== 部署完成 ====="
echo "请访问 http://crm.xinghun.info 检查网站是否正常运行" 