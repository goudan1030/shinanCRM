#!/bin/bash

# 服务器状态检查脚本

SERVER_IP="121.41.65.220"
SERVER_USER="root"
PROJECT_PORT="3002"

# 颜色配置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 服务器状态检查${NC}"
echo "=========================="

# 检查服务器连接
echo -e "${YELLOW}1. 检查服务器连接...${NC}"
if ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo '连接成功'" 2>/dev/null; then
    echo -e "${GREEN}✅ 服务器连接正常${NC}"
else
    echo -e "${RED}❌ 服务器连接失败${NC}"
    exit 1
fi

# 检查端口占用
echo -e "${YELLOW}2. 检查端口 $PROJECT_PORT...${NC}"
PORT_STATUS=$(ssh $SERVER_USER@$SERVER_IP "netstat -tuln | grep :$PROJECT_PORT" 2>/dev/null || echo "EMPTY")
if [[ $PORT_STATUS == *":$PROJECT_PORT"* ]]; then
    echo -e "${GREEN}✅ 端口 $PROJECT_PORT 正在使用中${NC}"
else
    echo -e "${RED}❌ 端口 $PROJECT_PORT 未被占用${NC}"
fi

# 检查PM2进程
echo -e "${YELLOW}3. 检查PM2进程...${NC}"
ssh $SERVER_USER@$SERVER_IP "pm2 list | grep sncrm-new" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PM2进程运行正常${NC}"
else
    echo -e "${RED}❌ PM2进程未找到${NC}"
fi

# 检查Nginx配置
echo -e "${YELLOW}4. 检查Nginx配置...${NC}"
NGINX_STATUS=$(ssh $SERVER_USER@$SERVER_IP "nginx -t" 2>&1)
if [[ $NGINX_STATUS == *"successful"* ]]; then
    echo -e "${GREEN}✅ Nginx配置正确${NC}"
else
    echo -e "${RED}❌ Nginx配置有误${NC}"
    echo "$NGINX_STATUS"
fi

# 检查应用响应
echo -e "${YELLOW}5. 检查应用响应...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP:$PROJECT_PORT" || echo "FAILED")
if [[ $HTTP_STATUS == "200" ]]; then
    echo -e "${GREEN}✅ 应用响应正常 (HTTP $HTTP_STATUS)${NC}"
elif [[ $HTTP_STATUS =~ ^[0-9]+$ ]]; then
    echo -e "${YELLOW}⚠️  应用响应异常 (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ 应用无法访问${NC}"
fi

echo "=========================="
echo -e "${BLUE}检查完成${NC}"

# 提供快速操作命令
echo ""
echo -e "${YELLOW}💡 常用命令：${NC}"
echo "查看应用日志: ssh $SERVER_USER@$SERVER_IP 'pm2 logs sncrm-new'"
echo "重启应用: ssh $SERVER_USER@$SERVER_IP 'pm2 restart sncrm-new'"
echo "查看服务器资源: ssh $SERVER_USER@$SERVER_IP 'htop'" 