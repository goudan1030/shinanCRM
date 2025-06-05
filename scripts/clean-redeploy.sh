#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"
PROJECT_DIR="/www/wwwroot/sncrm"

echo "开始清空服务器并重新部署..."

# 1. 清空服务器上的项目目录
echo "步骤1: 清空服务器项目目录..."
ssh $SERVER_USER@$SERVER_IP << EOT
# 停止现有的PM2进程
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

# 备份重要文件
echo "备份重要配置文件..."
mkdir -p /tmp/backup
cp $PROJECT_DIR/.env.local /tmp/backup/ 2>/dev/null || true
cp $PROJECT_DIR/ecosystem.config.js /tmp/backup/ 2>/dev/null || true

# 完全清空项目目录
echo "清空项目目录..."
rm -rf $PROJECT_DIR/*
rm -rf $PROJECT_DIR/.*env* 2>/dev/null || true
rm -rf $PROJECT_DIR/.next* 2>/dev/null || true

echo "服务器项目目录已清空"
EOT

# 2. 重新上传项目文件
echo "步骤2: 重新上传项目文件..."

# 创建临时压缩包，排除不必要的文件
echo "创建项目压缩包..."
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='scripts/static-site-fix.sh' \
    --exclude='scripts/fix-*' \
    --exclude='scripts/emergency-*' \
    --exclude='scripts/check-*' \
    --exclude='scripts/debug-*' \
    --exclude='deploy-package' \
    --exclude='*.tar.gz' \
    -czf clean-deploy.tar.gz .

# 上传压缩包
echo "上传项目文件到服务器..."
scp clean-deploy.tar.gz $SERVER_USER@$SERVER_IP:/tmp/

# 3. 在服务器上解压和配置
echo "步骤3: 解压并配置项目..."
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 解压项目文件
cd /www/wwwroot/sncrm
tar -xzf /tmp/clean-deploy.tar.gz
rm /tmp/clean-deploy.tar.gz

# 恢复重要配置文件
echo "恢复配置文件..."
cp /tmp/backup/.env.local . 2>/dev/null || echo "创建新的.env.local文件"

# 如果没有.env.local，创建一个
if [ ! -f .env.local ]; then
    echo "创建.env.local文件..."
    cat > .env.local << 'EOF'
# 数据库配置
DB_HOST=8.149.244.105
DB_PORT=3306
DB_USER=h5_cloud_user
DB_PASSWORD=z3Mzv3PePJPu3Q5w
DB_NAME=h5_cloud_db

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-12345

# Next.js配置
NEXTAUTH_URL=http://crm.xinghun.info
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# API配置
API_URL=http://crm.xinghun.info/api

# 应用配置
NODE_ENV=production
EOF
fi

# 创建正确的PM2配置
echo "创建PM2配置..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'sncrm',
      script: 'npm',
      args: 'start',
      cwd: '/www/wwwroot/sncrm',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/www/wwwlogs/sncrm_error.log',
      out_file: '/www/wwwlogs/sncrm_out.log',
      log_file: '/www/wwwlogs/sncrm_combined.log'
    }
  ]
};
EOF

# 设置正确的文件权限
echo "设置文件权限..."
chown -R www:www /www/wwwroot/sncrm
chmod -R 755 /www/wwwroot/sncrm

# 安装依赖
echo "安装项目依赖..."
npm install --production

echo "项目文件部署完成"
EOT

# 4. 配置Nginx
echo "步骤4: 配置Nginx..."
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 创建简洁的Nginx配置
echo "配置Nginx..."
cat > /www/server/panel/vhost/nginx/crm.xinghun.info.conf << 'EOF'
server {
    listen 80;
    server_name crm.xinghun.info;
    
    # 反向代理到Next.js应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 日志配置
    access_log /www/wwwlogs/crm.xinghun.info.log;
    error_log /www/wwwlogs/crm.xinghun.info.error.log;
}
EOF

# 测试并重新加载Nginx配置
echo "测试Nginx配置..."
nginx -t
if [ $? -eq 0 ]; then
    echo "Nginx配置测试通过，重新加载..."
    nginx -s reload
else
    echo "Nginx配置测试失败"
    exit 1
fi
EOT

# 5. 构建和启动应用
echo "步骤5: 构建和启动应用..."
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

# 构建Next.js应用
echo "构建Next.js应用..."
npm run build

if [ $? -eq 0 ]; then
    echo "构建成功，启动应用..."
    # 启动PM2应用
    pm2 start ecosystem.config.js
    
    # 保存PM2配置
    pm2 save
    
    echo "应用启动完成"
    
    # 显示应用状态
    pm2 status
    
    echo ""
    echo "部署完成！"
    echo "请访问 http://crm.xinghun.info 测试应用"
    echo ""
    echo "如需查看日志："
    echo "  pm2 logs sncrm"
    echo "  tail -f /www/wwwlogs/sncrm_combined.log"
else
    echo "构建失败，请检查错误信息"
    exit 1
fi
EOT

# 清理本地临时文件
echo "清理本地临时文件..."
rm -f clean-deploy.tar.gz

echo ""
echo "=========================================="
echo "重新部署完成！"
echo "=========================================="
echo "应用地址: http://crm.xinghun.info"
echo ""
echo "如果仍有问题，请运行以下命令查看日志："
echo "ssh root@8.149.244.105 'pm2 logs sncrm'"
echo "" 