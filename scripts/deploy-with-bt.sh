#!/bin/bash

# 阿里云服务器配置
SERVER_IP="YOUR_SERVER_IP"           # 例如：8.149.244.105
SERVER_USER="root"                   # 或其他有权限的用户
SERVER_PATH="/www/wwwroot/sncrm"     # 宝塔面板默认网站路径
SSH_KEY="~/.ssh/id_rsa"              # SSH密钥路径，如果使用密码认证则留空

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
echo -e "${YELLOW}开始使用宝塔面板部署 SNCRM 到阿里云服务器...${NC}"

# 本地构建
echo -e "${YELLOW}Step 1: 本地构建项目${NC}"
echo -e "正在安装依赖..."
npm install
check_status "安装依赖"

echo -e "正在构建项目..."
npm run build
check_status "构建项目"

# 配置SSH命令
SSH_CMD="ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
if [ -z "$SSH_KEY" ]; then
  SSH_CMD="ssh $SERVER_USER@$SERVER_IP"
fi

# 在服务器上创建目录
echo -e "${YELLOW}Step 2: 准备远程服务器${NC}"
echo -e "检查并创建部署目录..."
$SSH_CMD "mkdir -p $SERVER_PATH"
check_status "创建部署目录"

# 检查Node.js环境
echo -e "检查Node.js环境..."
$SSH_CMD "if ! command -v node &> /dev/null; then 
  echo '未安装Node.js，请在宝塔面板中安装Node.js'; 
  exit 1; 
fi"
check_status "检查Node.js环境"

# 检查PM2
echo -e "检查PM2..."
$SSH_CMD "if ! command -v pm2 &> /dev/null; then 
  npm install -g pm2; 
fi"
check_status "检查PM2"

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

# 在服务器上安装依赖
echo -e "${YELLOW}Step 4: 安装依赖${NC}"
$SSH_CMD "cd $SERVER_PATH && npm install --production"
check_status "安装生产依赖"

# 配置PM2
echo -e "${YELLOW}Step 5: 配置PM2${NC}"
$SSH_CMD "cd $SERVER_PATH && 
  if pm2 list | grep -q 'sncrm'; then
    pm2 delete sncrm
  fi && 
  pm2 start npm --name 'sncrm' -- start && 
  pm2 save && 
  pm2 startup"
check_status "配置PM2"

# 完成
echo -e "${GREEN}部署完成! 您的应用已成功部署到阿里云服务器.${NC}"
echo -e "${YELLOW}请在宝塔面板中配置网站:${NC}"
echo -e "1. 创建网站，域名填写您的域名"
echo -e "2. 网站目录设置为: ${SERVER_PATH}"
echo -e "3. 在'设置'中配置反向代理:"
echo -e "   - 目标URL: http://127.0.0.1:3000"
echo -e "   - 发送域名: \$host"
echo -e "4. 如需配置HTTPS，请在宝塔面板中申请SSL证书"
echo -e "${YELLOW}访问地址: http://$SERVER_IP 或您配置的域名${NC}" 