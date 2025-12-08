#!/bin/bash

# 修复 502 错误的脚本
# 502 Bad Gateway 通常表示应用未正常启动或 Nginx 无法连接到后端

set -e

echo "=========================================="
echo "修复 502 Bad Gateway 错误"
echo "=========================================="
echo ""

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误：请在项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}步骤 1: 检查 PM2 进程状态${NC}"
pm2 status

echo ""
echo -e "${YELLOW}步骤 2: 检查应用是否在运行${NC}"

# 检查端口 3001 是否被占用
if lsof -i:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 端口 3001 已被占用${NC}"
    lsof -i:3001
else
    echo -e "${RED}✗ 端口 3001 未被占用，应用可能未启动${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 3: 检查构建文件${NC}"

if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
    BUILD_ID=$(cat .next/BUILD_ID)
    echo -e "${GREEN}✓ 构建文件存在，构建ID: $BUILD_ID${NC}"
else
    echo -e "${RED}✗ 构建文件不存在，需要重新构建${NC}"
    echo "正在清理并重新构建..."
    rm -rf .next
    export NODE_OPTIONS="--max-old-space-size=2048"
    npm run build
    echo -e "${GREEN}✓ 构建完成${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 4: 停止并清理旧的 PM2 进程${NC}"

# 停止所有 sncrm 相关进程
pm2 stop sncrm 2>/dev/null || true
pm2 delete sncrm 2>/dev/null || true

echo -e "${GREEN}✓ 旧进程已清理${NC}"

echo ""
echo -e "${YELLOW}步骤 5: 启动应用${NC}"

# 检查是否有 ecosystem.config.js
if [ -f "ecosystem.config.js" ]; then
    echo "使用 ecosystem.config.js 启动..."
    # 检查配置中的端口
    PORT=$(grep -o "PORT.*[0-9]*" ecosystem.config.js | grep -o "[0-9]*" | head -1 || echo "3001")
    echo "配置的端口: $PORT"
    
    # 修改 ecosystem.config.js 中的进程名（如果需要）
    if grep -q "sncrm-new" ecosystem.config.js; then
        echo "更新进程名..."
        sed -i 's/sncrm-new/sncrm/g' ecosystem.config.js
    fi
    
    pm2 start ecosystem.config.js
else
    echo "使用默认配置启动..."
    pm2 start npm --name "sncrm" -- start
fi

# 等待几秒让应用启动
sleep 5

echo ""
echo -e "${YELLOW}步骤 6: 验证应用状态${NC}"

# 检查 PM2 状态
if pm2 list | grep -q "sncrm.*online"; then
    echo -e "${GREEN}✓ 应用已成功启动${NC}"
    pm2 status | grep sncrm
else
    echo -e "${RED}✗ 应用启动失败${NC}"
    echo "查看错误日志："
    pm2 logs sncrm --lines 30 --err
    exit 1
fi

# 检查端口
if lsof -i:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 端口 3001 正在监听${NC}"
else
    echo -e "${YELLOW}⚠️  端口 3001 未监听，检查其他端口...${NC}"
    # 检查其他可能的端口
    for port in 3000 3002 3003; do
        if lsof -i:$port > /dev/null 2>&1; then
            echo "发现端口 $port 正在使用"
        fi
    done
fi

echo ""
echo -e "${YELLOW}步骤 7: 测试应用响应${NC}"

# 测试本地连接
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 应用响应正常${NC}"
elif curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 应用响应正常（127.0.0.1）${NC}"
else
    echo -e "${YELLOW}⚠️  本地连接测试失败，但应用可能正在启动中...${NC}"
    echo "请稍等片刻后再次测试"
fi

echo ""
echo -e "${YELLOW}步骤 8: 检查 Nginx 配置${NC}"

# 查找 Nginx 配置文件
NGINX_CONFIGS=(
    "/etc/nginx/sites-enabled/admin.xinghun.info"
    "/etc/nginx/conf.d/admin.xinghun.info.conf"
    "/www/server/panel/vhost/nginx/admin.xinghun.info.conf"
    "/www/server/nginx/conf/vhost/admin.xinghun.info.conf"
)

NGINX_CONFIG_FOUND=false
for config_file in "${NGINX_CONFIGS[@]}"; do
    if [ -f "$config_file" ]; then
        echo "找到 Nginx 配置文件: $config_file"
        NGINX_CONFIG_FOUND=true
        
        # 检查代理配置
        if grep -q "proxy_pass.*3001" "$config_file"; then
            echo -e "${GREEN}✓ Nginx 配置正确（代理到 3001 端口）${NC}"
        else
            echo -e "${YELLOW}⚠️  Nginx 配置可能不正确，请检查 proxy_pass 设置${NC}"
            echo "应该指向: http://127.0.0.1:3001"
        fi
        break
    fi
done

if [ "$NGINX_CONFIG_FOUND" = false ]; then
    echo -e "${YELLOW}⚠️  未找到 Nginx 配置文件${NC}"
    echo "请手动检查 Nginx 配置"
fi

echo ""
echo -e "${YELLOW}步骤 9: 重载 Nginx（如果需要）${NC}"

if command -v nginx &> /dev/null; then
    echo "测试 Nginx 配置..."
    if nginx -t 2>/dev/null; then
        echo "重载 Nginx..."
        nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || /etc/init.d/nginx reload 2>/dev/null || true
        echo -e "${GREEN}✓ Nginx 已重载${NC}"
    else
        echo -e "${RED}✗ Nginx 配置测试失败${NC}"
        echo "请手动检查 Nginx 配置"
    fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo "修复完成！"
echo "==========================================${NC}"
echo ""
echo "验证步骤："
echo "  1. 检查应用状态: pm2 status"
echo "  2. 查看应用日志: pm2 logs sncrm --lines 50"
echo "  3. 测试本地连接: curl http://localhost:3001"
echo "  4. 访问网站: https://admin.xinghun.info"
echo ""
echo "如果仍然 502，请检查："
echo "  - Nginx 错误日志: /www/wwwlogs/admin.xinghun.info.error.log"
echo "  - 应用错误日志: pm2 logs sncrm --err"
echo "  - 端口是否正确: lsof -i:3001"
echo ""
