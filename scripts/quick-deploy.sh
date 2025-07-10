#!/bin/bash

# 简化快速部署脚本
# 适合初学者使用

set -e  # 遇到错误立即退出

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务器配置（请根据你的实际情况修改）
SERVER_IP="8.149.244.105"
SERVER_USER="root"
PROJECT_PORT="3002"

echo -e "${BLUE}🚀 SNCRM 快速部署脚本${NC}"
echo -e "${YELLOW}服务器: $SERVER_IP${NC}"
echo -e "${YELLOW}端口: $PROJECT_PORT${NC}"
echo ""

# 步骤1：本地构建
echo -e "${BLUE}📦 第1步：本地构建${NC}"
echo "清理缓存..."
rm -rf .next node_modules/.cache

echo "安装依赖..."
npm install

echo "构建项目..."
npm run build

echo -e "${GREEN}✅ 本地构建完成${NC}"
echo ""

# 步骤2：运行部署脚本
echo -e "${BLUE}🌐 第2步：开始部署到服务器${NC}"
chmod +x scripts/deploy-to-aliyun-new.sh
./scripts/deploy-to-aliyun-new.sh

echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo -e "${YELLOW}访问地址：${BLUE}http://$SERVER_IP:$PROJECT_PORT${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "1. 如果无法访问，请检查服务器防火墙是否开放 $PROJECT_PORT 端口"
echo "2. 可以通过 ssh $SERVER_USER@$SERVER_IP 登录服务器查看日志"
echo "3. 在服务器上运行 pm2 logs sncrm-new 查看应用日志" 