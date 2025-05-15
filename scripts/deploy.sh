#!/bin/bash

# SNCRM 部署脚本
# 提供一个完整的构建和部署流程

set -e  # 遇到错误停止执行

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 显示步骤标题
show_step() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# 显示成功消息
show_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# 显示错误消息
show_error() {
  echo -e "${RED}✗ $1${NC}"
}

# 检查Node.js版本
show_step "检查环境依赖"
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node版本: $node_version"
echo "NPM版本: $npm_version"

# 检查运行目录是否正确
if [ ! -f "package.json" ]; then
  show_error "错误: 找不到package.json文件"
  echo "请确保在项目根目录下运行此脚本"
  exit 1
fi

# 安装依赖
show_step "安装项目依赖"
npm ci

# 数据库优化
show_step "执行数据库优化"
npm run db:optimize

# 优化图片资源
show_step "优化静态资源"
npm run optimize:images

# 检查环境变量
show_step "检查环境变量"
if [ ! -f ".env.production" ]; then
  show_error "警告: 找不到.env.production文件"
  echo "将使用默认环境变量，请确保服务配置正确"
else
  show_success "发现.env.production文件"
fi

# 构建生产版本
show_step "构建生产版本"
NODE_ENV=production npm run build

# 运行简单的构建验证
show_step "验证构建输出"
if [ -d ".next" ]; then
  show_success "构建输出目录(.next)已创建"
  echo "构建输出大小: $(du -sh .next | cut -f1)"
else
  show_error "构建可能失败，找不到.next目录"
  exit 1
fi

# 压缩构建输出
show_step "压缩构建输出"
BUILD_NAME="sncrm-build-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf $BUILD_NAME .next public package.json next.config.js .env.production

show_success "构建包已创建: $BUILD_NAME ($(du -sh $BUILD_NAME | cut -f1))"

# 部署说明
show_step "部署指南"
echo "构建完成，现在您可以:"
echo "1. 将 $BUILD_NAME 上传到您的服务器"
echo "2. 在服务器上解压: tar -xzf $BUILD_NAME"
echo "3. 安装依赖: npm install --production"
echo "4. 启动服务: npm run start:prod"

# 如果需要自动部署到服务器，可以取消注释以下内容
# 需要配置SSH密钥以允许无密码登录

# SERVER_HOST="your.server.com"
# SERVER_USER="username"
# SERVER_PATH="/path/to/deployment"
# 
# show_step "部署到服务器"
# echo "正在上传到 $SERVER_HOST..."
# 
# # 上传构建包
# scp $BUILD_NAME $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
# 
# # 执行远程部署命令
# ssh $SERVER_USER@$SERVER_HOST << EOF
#   cd $SERVER_PATH
#   # 停止当前服务
#   pm2 stop sncrm || true
#   
#   # 备份当前版本
#   if [ -d "current" ]; then
#     mv current previous_\$(date +%Y%m%d-%H%M%S)
#   fi
#   
#   # 创建新的部署目录
#   mkdir -p current
#   tar -xzf $BUILD_NAME -C current
#   cd current
#   
#   # 安装生产依赖
#   npm install --production
#   
#   # 启动服务
#   pm2 start npm --name "sncrm" -- run start:prod
#   
#   # 清理旧备份和构建包
#   cd ..
#   find . -name "previous_*" -type d -mtime +7 -exec rm -rf {} \;
#   find . -name "sncrm-build-*.tar.gz" -mtime +7 -exec rm {} \;
# EOF
# 
# show_success "部署完成!"

show_success "所有步骤已完成!" 