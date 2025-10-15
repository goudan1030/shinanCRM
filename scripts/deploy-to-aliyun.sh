#!/bin/bash

# 阿里云服务器配置
SERVER_IP="YOUR_SERVER_IP"       # 例如：121.41.65.220
SERVER_USER="root"               # 或其他有权限的用户
SERVER_PATH="/var/www/sncrm"     # 部署路径
SSH_KEY="~/.ssh/id_rsa"          # SSH密钥路径，如果使用密码认证则留空

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 检查命令执行状态
check_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1 成功${NC}"
  else
    echo -e "${RED}✗ $1 失败${NC}"
    exit 1
  fi
}

# 构建前提示
echo -e "${YELLOW}开始部署 SNCRM 到阿里云服务器...${NC}"

# 本地构建
echo -e "${YELLOW}Step 1: 本地构建项目${NC}"
echo -e "正在安装依赖..."
npm install
check_status "安装依赖"

echo -e "正在构建项目..."
npm run build
check_status "构建项目"

# 创建部署目录
echo -e "${YELLOW}Step 2: 准备远程服务器${NC}"
SSH_CMD="ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
if [ -z "$SSH_KEY" ]; then
  SSH_CMD="ssh $SERVER_USER@$SERVER_IP"
fi

echo -e "检查并创建部署目录..."
$SSH_CMD "mkdir -p $SERVER_PATH"
check_status "创建部署目录"

# 安装必要的软件包
echo -e "检查并安装必要的软件包..."
$SSH_CMD "if ! command -v node &> /dev/null; then 
  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs; 
fi;
if ! command -v npm &> /dev/null; then apt-get install -y npm; fi;
if ! command -v pm2 &> /dev/null; then npm install -g pm2; fi;
if ! command -v nginx &> /dev/null; then apt-get install -y nginx; fi;
if ! command -v git &> /dev/null; then apt-get install -y git; fi"
check_status "安装软件包"

# 传输文件
echo -e "${YELLOW}Step 3: 传输项目文件${NC}"
echo -e "将文件传输到服务器..."

# 使用rsync传输文件，排除node_modules和.git
rsync_cmd="rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.next/cache'"
if [ ! -z "$SSH_KEY" ]; then
  rsync_cmd="$rsync_cmd -e 'ssh -i $SSH_KEY'"
fi

$rsync_cmd ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH
check_status "文件传输"

# 在服务器上安装依赖并启动服务
echo -e "${YELLOW}Step 4: 安装依赖并启动服务${NC}"
$SSH_CMD "cd $SERVER_PATH && npm install --production"
check_status "安装生产依赖"

# 配置PM2
echo -e "配置PM2..."
$SSH_CMD "cd $SERVER_PATH && 
  if pm2 list | grep -q 'sncrm'; then
    pm2 delete sncrm
  fi && 
  pm2 start npm --name 'sncrm' -- start && 
  pm2 save && 
  pm2 startup"
check_status "配置PM2"

# 配置Nginx
echo -e "${YELLOW}Step 5: 配置Nginx${NC}"
NGINX_CONFIG="server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}"

$SSH_CMD "echo '$NGINX_CONFIG' > /etc/nginx/sites-available/sncrm && 
  ln -sf /etc/nginx/sites-available/sncrm /etc/nginx/sites-enabled/ && 
  nginx -t && 
  systemctl restart nginx"
check_status "配置Nginx"

# 完成
echo -e "${GREEN}部署完成! 您的应用已成功部署到阿里云服务器.${NC}"
echo -e "${YELLOW}访问地址: http://$SERVER_IP${NC}" 