#!/bin/bash

# 完成构建并重启应用的脚本
# 用于解决构建被 kill 的问题

set -e

echo "=========================================="
echo "完成构建并重启应用"
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

echo -e "${YELLOW}步骤 1: 检查系统资源${NC}"

# 检查内存
FREE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $4}')
echo "可用内存: ${FREE_MEM}MB"

if [ "$FREE_MEM" -lt 1024 ]; then
    echo -e "${YELLOW}⚠️  警告：可用内存较少（${FREE_MEM}MB），构建可能需要较长时间${NC}"
    echo "建议：如果构建失败，可以尝试增加 swap 空间"
fi

echo ""
echo -e "${YELLOW}步骤 2: 清理构建缓存${NC}"
rm -rf .next
echo -e "${GREEN}✓ 构建缓存已清理${NC}"
echo ""

echo -e "${YELLOW}步骤 3: 重新构建应用${NC}"
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

# 设置 Node.js 内存限制（如果内存不足）
export NODE_OPTIONS="--max-old-space-size=2048"

# 尝试构建
if npm run build; then
    echo ""
    echo -e "${GREEN}✓ 构建成功${NC}"
else
    echo ""
    echo -e "${RED}✗ 构建失败${NC}"
    echo ""
    echo "可能的原因："
    echo "1. 内存不足 - 尝试增加 swap 空间"
    echo "2. 磁盘空间不足 - 检查磁盘空间"
    echo "3. 依赖问题 - 尝试删除 node_modules 重新安装"
    echo ""
    echo "建议操作："
    echo "  # 增加 swap（如果需要）"
    echo "  # 检查磁盘空间"
    echo "  df -h"
    echo "  # 如果内存不足，可以尝试："
    echo "  rm -rf node_modules"
    echo "  npm install"
    echo "  npm run build"
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 4: 检查构建结果${NC}"

if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
    BUILD_ID=$(cat .next/BUILD_ID)
    echo -e "${GREEN}✓ 构建完成，构建ID: $BUILD_ID${NC}"
else
    echo -e "${RED}✗ 构建目录不存在或构建不完整${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}步骤 5: 重启应用${NC}"

# 检查 PM2 进程
if command -v pm2 &> /dev/null; then
    # 停止现有进程
    if pm2 list | grep -q "sncrm"; then
        echo "正在停止现有进程..."
        pm2 stop sncrm || true
        pm2 delete sncrm || true
    fi
    
    # 启动新进程
    echo "正在启动应用..."
    
    # 检查是否有 ecosystem.config.js
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    else
        # 使用默认配置启动
        pm2 start npm --name "sncrm" -- start
    fi
    
    # 等待几秒
    sleep 3
    
    # 检查状态
    if pm2 list | grep -q "sncrm.*online"; then
        echo -e "${GREEN}✓ 应用已成功启动${NC}"
    else
        echo -e "${YELLOW}⚠️  应用可能未正常启动，请检查日志${NC}"
        echo "查看日志: pm2 logs sncrm"
    fi
else
    echo -e "${YELLOW}未检测到 PM2，请手动启动应用${NC}"
    echo "启动命令: npm start"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "完成！"
echo "==========================================${NC}"
echo ""
echo "验证命令："
echo "  pm2 status              # 查看应用状态"
echo "  pm2 logs sncrm          # 查看应用日志"
echo "  curl http://localhost:3001  # 测试应用响应"
echo ""
