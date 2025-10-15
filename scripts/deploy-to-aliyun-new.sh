#!/bin/bash

# 阿里云服务器配置
SERVER_IP="121.41.65.220"        # 你的服务器IP
SERVER_USER="root"               # 或其他有权限的用户
SERVER_PATH="/www/wwwroot/sncrm-new"  # 新的部署路径，避免冲突
SSH_KEY=""                       # SSH密钥路径，如果使用密码认证则留空
PROJECT_PORT="3002"              # 新端口号，避免与现有项目冲突

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
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
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    开始部署 SNCRM 到阿里云服务器${NC}"
echo -e "${BLUE}    端口: $PROJECT_PORT${NC}"
echo -e "${BLUE}    路径: $SERVER_PATH${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查本地环境
echo -e "${YELLOW}Step 1: 检查本地环境${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}请先安装 Node.js${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}请先安装 npm${NC}"
    exit 1
fi

# 本地构建
echo -e "${YELLOW}Step 2: 本地构建项目${NC}"
echo -e "正在清理缓存..."
rm -rf .next
rm -rf node_modules/.cache
check_status "清理缓存"

echo -e "正在安装依赖..."
npm install
check_status "安装依赖"

echo -e "正在构建项目..."
npm run build
check_status "构建项目"

# 设置SSH命令
SSH_CMD="ssh $SERVER_USER@$SERVER_IP"
SCP_CMD="scp"
RSYNC_CMD="rsync -avz --progress"

if [ ! -z "$SSH_KEY" ]; then
  SSH_CMD="ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
  SCP_CMD="scp -i $SSH_KEY"
  RSYNC_CMD="rsync -avz --progress -e 'ssh -i $SSH_KEY'"
fi

# 准备远程服务器
echo -e "${YELLOW}Step 3: 准备远程服务器${NC}"
echo -e "检查并创建部署目录..."
$SSH_CMD "mkdir -p $SERVER_PATH && mkdir -p $SERVER_PATH/logs"
check_status "创建部署目录"

# 检查端口是否被占用
echo -e "检查端口 $PROJECT_PORT 是否可用..."
PORT_CHECK=$($SSH_CMD "netstat -tuln | grep :$PROJECT_PORT || echo 'AVAILABLE'")
if [[ $PORT_CHECK != *"AVAILABLE"* ]]; then
    echo -e "${RED}端口 $PROJECT_PORT 已被占用，请选择其他端口${NC}"
    exit 1
fi
echo -e "${GREEN}端口 $PROJECT_PORT 可用${NC}"

# 传输项目文件
echo -e "${YELLOW}Step 4: 传输项目文件${NC}"
echo -e "正在传输文件到服务器..."

# 排除不必要的文件
$RSYNC_CMD \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next/cache' \
  --exclude='*.log' \
  --exclude='.env.local' \
  ./ $SERVER_USER@$SERVER_IP:$SERVER_PATH/
check_status "文件传输"

# 在服务器上安装依赖
echo -e "${YELLOW}Step 5: 服务器环境配置${NC}"
echo -e "正在安装生产依赖..."
$SSH_CMD "cd $SERVER_PATH && npm install --only=production"
check_status "安装生产依赖"

# 配置环境变量
echo -e "配置环境变量..."
$SSH_CMD "cd $SERVER_PATH && 
if [ ! -f .env ]; then
  cp env.template .env
  echo 'PORT=$PROJECT_PORT' >> .env
  echo '请检查并修改 $SERVER_PATH/.env 文件中的配置'
fi"
check_status "配置环境变量"

# 配置PM2
echo -e "${YELLOW}Step 6: 配置PM2进程管理${NC}"
$SSH_CMD "cd $SERVER_PATH && 
# 如果已存在同名进程则删除
if pm2 list | grep -q 'sncrm-new'; then
  pm2 delete sncrm-new
fi && 
# 启动新进程
pm2 start ecosystem.config.js && 
pm2 save"
check_status "配置PM2"

# 传输并配置Nginx
echo -e "${YELLOW}Step 7: 配置Nginx反向代理${NC}"
$SCP_CMD scripts/nginx-sncrm-new.conf $SERVER_USER@$SERVER_IP:/tmp/
$SSH_CMD "
# 备份现有配置
if [ -f /etc/nginx/sites-available/sncrm-new ]; then
  cp /etc/nginx/sites-available/sncrm-new /etc/nginx/sites-available/sncrm-new.bak
fi &&
# 复制新配置
cp /tmp/nginx-sncrm-new.conf /etc/nginx/sites-available/sncrm-new &&
# 创建软链接
ln -sf /etc/nginx/sites-available/sncrm-new /etc/nginx/sites-enabled/ &&
# 测试配置
nginx -t &&
# 重载nginx
systemctl reload nginx"
check_status "配置Nginx"

# 验证部署
echo -e "${YELLOW}Step 8: 验证部署${NC}"
sleep 5
$SSH_CMD "pm2 status sncrm-new"
check_status "验证PM2状态"

# 完成部署
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}访问信息:${NC}"
echo -e "  🌐 HTTP访问: ${BLUE}http://$SERVER_IP:$PROJECT_PORT${NC}"
echo -e "  📁 项目路径: ${BLUE}$SERVER_PATH${NC}"
echo -e "  🔧 PM2进程名: ${BLUE}sncrm-new${NC}"
echo -e ""
echo -e "${YELLOW}常用管理命令:${NC}"
echo -e "  查看日志: ${BLUE}pm2 logs sncrm-new${NC}"
echo -e "  重启应用: ${BLUE}pm2 restart sncrm-new${NC}"
echo -e "  停止应用: ${BLUE}pm2 stop sncrm-new${NC}"
echo -e "  查看状态: ${BLUE}pm2 status${NC}"
echo -e ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "1. 修改 ${BLUE}$SERVER_PATH/.env${NC} 文件中的数据库等配置"
echo -e "2. 配置域名DNS指向 ${BLUE}$SERVER_IP${NC}"
echo -e "3. 如需SSL证书，请配置HTTPS" 