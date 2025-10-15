#!/bin/bash

# 设置变量
SERVER_IP="121.41.65.220"
SERVER_USER="root"

echo "修复package.json并重新启动应用..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

# 修复package.json，移除problematic postbuild脚本
echo "修复package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 移除或修复problematic scripts
delete pkg.scripts.postbuild;
if (pkg.scripts['build:prod']) {
  pkg.scripts['build:prod'] = 'next build';
}
if (pkg.scripts.deploy) {
  pkg.scripts.deploy = 'npm run build';
}
if (pkg.scripts['deploy:netlify']) {
  pkg.scripts['deploy:netlify'] = 'npm run build';
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json已修复');
"

# 确保.env.local文件存在
echo "检查.env.local文件..."
if [ ! -f .env.local ]; then
    echo "创建.env.local文件..."
    cat > .env.local << 'EOF'
# 数据库配置
DB_HOST=121.41.65.220
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

# 重新构建应用
echo "重新构建应用..."
npm run build

if [ $? -eq 0 ]; then
    echo "构建成功！启动应用..."
    
    # 停止现有的PM2进程
    pm2 stop sncrm 2>/dev/null || true
    pm2 delete sncrm 2>/dev/null || true
    
    # 启动新的PM2进程
    pm2 start ecosystem.config.js
    
    # 保存PM2配置
    pm2 save
    
    echo "应用已成功启动"
    
    # 显示应用状态
    echo ""
    echo "=== PM2 应用状态 ==="
    pm2 status
    
    echo ""
    echo "=== 应用日志（最后20行）==="
    pm2 logs sncrm --lines 20 --nostream || echo "暂无日志"
    
    echo ""
    echo "=========================================="
    echo "部署成功完成！"
    echo "=========================================="
    echo "应用地址: http://crm.xinghun.info"
    echo ""
    echo "如需实时查看日志："
    echo "  ssh root@121.41.65.220 'pm2 logs sncrm'"
    echo ""
    
else
    echo "构建失败，请检查错误信息"
    exit 1
fi
EOT

echo "package.json修复和应用重启完成" 