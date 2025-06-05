#!/bin/bash

# SNCRM一键部署脚本
# 整合所有修复方案，实现一步到位的部署

# 显示彩色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 显示标题
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}   SNCRM 一键部署和修复脚本     ${NC}"
echo -e "${GREEN}=================================${NC}"
echo "部署时间: $(date)"
echo

# 设置变量
APP_DIR="/www/wwwroot/sncrm"
SERVER_IP="8.149.244.105"
SERVER_USER="root"
NGINX_CONF="/www/server/panel/vhost/nginx/crm.xinghun.info.conf"
DOMAIN="crm.xinghun.info"

# 1. 构建Next.js应用
echo -e "${YELLOW}[1/7] 构建Next.js应用${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 构建失败，请检查错误并修复后重试${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 构建成功${NC}"
echo

# 2. 准备部署包
echo -e "${YELLOW}[2/7] 准备部署包${NC}"
rm -rf deploy-package
mkdir -p deploy-package

# 复制必要文件
cp -r .next deploy-package/
cp -r public deploy-package/
cp package.json deploy-package/
cp next.config.js deploy-package/
cp -r node_modules deploy-package/next
cp ecosystem.config.js deploy-package/

# 准备环境变量文件
cat > deploy-package/.env.production << EOL
# 数据库配置
DB_HOST=8.149.244.105
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=mc72TNcMmy6HCybH
DB_NAME=h5_cloud_db

# JWT配置
JWT_SECRET=sn8we6nRudHjsDnso7h3Qzpr5Pax8Jwe

# 服务器配置
SERVER_URL=http://8.149.244.105:8888/
NODE_ENV=production
PORT=3001
EOL

# 创建Nginx配置
cat > deploy-package/nginx-sncrm.conf << 'EOL'
server {
    listen 80;
    server_name crm.xinghun.info 8.149.244.105;
    
    # 强制不缓存HTML和JSON响应
    location ~* \.(html|json)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        expires -1;
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Next.js静态资源 - 精确定位
    location /_next/static/ {
        alias /www/wwwroot/sncrm/.next/static/;
        expires max;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # 特殊处理 _next/data 路径
    location /_next/data/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        # 先尝试从public目录提供
        root /www/wwwroot/sncrm;
        try_files /public$uri $uri =404;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # 上传文件目录
    location /uploads/ {
        alias /www/wwwroot/sncrm/public/uploads/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }
    
    # 默认处理
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 增加缓冲设置
        proxy_buffer_size 64k;
        proxy_buffers 4 64k;
        proxy_busy_buffers_size 128k;
        
        # 增加超时时间
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
    
    # 日志设置
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOL

# 创建服务器端部署脚本
cat > deploy-package/server-deploy.sh << 'EOL'
#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== 开始部署SNCRM系统 =====${NC}"

# 设置部署目录
APP_DIR="/www/wwwroot/sncrm"
NGINX_CONF="/www/server/panel/vhost/nginx/crm.xinghun.info.conf"

# 1. 停止当前应用
echo -e "${YELLOW}[1/5] 停止当前应用${NC}"
pm2 delete sncrm || true
echo -e "${GREEN}✅ 应用已停止${NC}"

# 2. 备份和准备目录
echo -e "${YELLOW}[2/5] 准备部署目录${NC}"
# 备份上传目录
if [ -d $APP_DIR/public/uploads ]; then
  mkdir -p /tmp/sncrm-backup
  cp -r $APP_DIR/public/uploads /tmp/sncrm-backup/
  echo -e "${GREEN}✅ 已备份上传目录${NC}"
fi

# 清空当前目录
find $APP_DIR -mindepth 1 -not -name '.user.ini' -delete
echo -e "${GREEN}✅ 已清空部署目录${NC}"

# 3. 复制文件
echo -e "${YELLOW}[3/5] 复制应用文件${NC}"
# 复制文件
cp -r * $APP_DIR/
cp -r .next $APP_DIR/
cp .env.production $APP_DIR/

# 恢复上传目录
if [ -d /tmp/sncrm-backup/uploads ]; then
  mkdir -p $APP_DIR/public/
  cp -r /tmp/sncrm-backup/uploads $APP_DIR/public/
  rm -rf /tmp/sncrm-backup
  echo -e "${GREEN}✅ 已恢复上传目录${NC}"
fi

# 设置权限
chmod -R 755 $APP_DIR
chown -R www:www $APP_DIR
echo -e "${GREEN}✅ 已设置目录权限${NC}"

# 4. 更新Nginx配置
echo -e "${YELLOW}[4/5] 更新Nginx配置${NC}"
cp nginx-sncrm.conf $NGINX_CONF
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    /etc/init.d/nginx reload
    echo -e "${GREEN}✅ Nginx已重启${NC}"
else
    echo -e "${RED}❌ Nginx配置测试失败，使用默认配置${NC}"
    cat > $NGINX_CONF << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    access_log /www/wwwlogs/sncrm.access.log;
    error_log /www/wwwlogs/sncrm.error.log;
}
EOF
    /etc/init.d/nginx reload
    echo -e "${YELLOW}⚠️ 已使用基本Nginx配置${NC}"
fi

# 5. 启动应用
echo -e "${YELLOW}[5/5] 启动应用${NC}"
cd $APP_DIR
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 应用已启动${NC}"
else
    echo -e "${RED}❌ 应用启动失败，尝试使用直接命令启动${NC}"
    NODE_ENV=production PORT=3001 pm2 start .next/standalone/server.js --name sncrm
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 应用已通过备用方式启动${NC}"
    else
        echo -e "${RED}❌ 所有启动方式均失败，请手动检查${NC}"
    fi
fi

# 6. 打印部署结果
echo -e "${GREEN}===== 部署完成 =====${NC}"
echo -e "请访问 http://crm.xinghun.info 检查网站是否正常运行"
echo -e "如果遇到问题，请检查以下日志:"
echo -e "- Nginx错误日志: /www/wwwlogs/sncrm.error.log"
echo -e "- PM2日志: pm2 logs sncrm"
echo 
EOL

# 使脚本可执行
chmod +x deploy-package/server-deploy.sh

# 打包文件
cd deploy-package && tar -czvf ../sncrm-deploy.tar.gz . && cd ..
echo -e "${GREEN}✅ 部署包准备完成${NC}"
echo

# 3. 上传到服务器
echo -e "${YELLOW}[3/7] 上传到服务器${NC}"
scp sncrm-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 上传失败，请检查网络连接和服务器配置${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 部署包已上传${NC}"
echo

# 4. 在服务器上执行部署
echo -e "${YELLOW}[4/7] 执行服务器部署${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOT'
mkdir -p /tmp/sncrm-deploy
tar -xzvf /tmp/sncrm-deploy.tar.gz -C /tmp/sncrm-deploy
cd /tmp/sncrm-deploy
chmod +x server-deploy.sh
./server-deploy.sh
rm -rf /tmp/sncrm-deploy
rm -f /tmp/sncrm-deploy.tar.gz
EOT

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 服务器部署过程中发生错误${NC}"
    echo -e "${YELLOW}⚠️ 尝试修复常见问题${NC}"
    
    # 5. 修复常见问题
    echo -e "${YELLOW}[5/7] 修复常见问题${NC}"
    ssh $SERVER_USER@$SERVER_IP << 'EOT'
    # 确保 PM2 正确安装
    npm install -g pm2@latest
    
    # 检查并修复静态资源目录
    mkdir -p /www/wwwroot/sncrm/.next/static
    mkdir -p /www/wwwroot/sncrm/public/uploads
    chmod -R 755 /www/wwwroot/sncrm
    chown -R www:www /www/wwwroot/sncrm
    
    # 重启Nginx
    /etc/init.d/nginx restart
    
    # 重启应用
    cd /www/wwwroot/sncrm
    pm2 delete sncrm || true
    pm2 start ecosystem.config.js || NODE_ENV=production PORT=3001 pm2 start .next/standalone/server.js --name sncrm
EOT
else
    echo -e "${GREEN}✅ 服务器部署成功${NC}"
fi
echo

# 6. 验证部署
echo -e "${YELLOW}[6/7] 验证部署${NC}"
HEALTH_CHECK_URL="http://$DOMAIN"
if command -v curl &> /dev/null; then
    echo "检查网站可访问性..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✅ 网站可以访问 (状态码: $HTTP_CODE)${NC}"
    else
        echo -e "${RED}❌ 网站访问失败 (状态码: $HTTP_CODE)${NC}"
        echo -e "${YELLOW}⚠️ 请手动检查服务器配置${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ curl工具未安装，无法测试网站可访问性${NC}"
fi
echo

# 7. 清理本地临时文件
echo -e "${YELLOW}[7/7] 清理临时文件${NC}"
rm -rf deploy-package
rm -f sncrm-deploy.tar.gz
echo -e "${GREEN}✅ 临时文件已清理${NC}"
echo

# 完成
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}      部署和修复过程已完成        ${NC}"
echo -e "${GREEN}=================================${NC}"
echo -e "网站地址: ${YELLOW}http://$DOMAIN${NC}"
echo -e "如需帮助，请查看以下日志:"
echo -e "- Nginx访问日志: ${YELLOW}/www/wwwlogs/sncrm.access.log${NC}"
echo -e "- Nginx错误日志: ${YELLOW}/www/wwwlogs/sncrm.error.log${NC}"
echo -e "- PM2日志: ${YELLOW}pm2 logs sncrm${NC}"
echo
echo -e "如果遇到问题，可以运行以下脚本检查系统健康状态:"
echo -e "${YELLOW}./scripts/system-health-check.sh${NC}"
echo -e "或者运行以下脚本修复静态资源404问题:"
echo -e "${YELLOW}./scripts/fix-static-resources.sh${NC}" 