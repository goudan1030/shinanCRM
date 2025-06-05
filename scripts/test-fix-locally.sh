#!/bin/bash

# 用于本地测试修复的脚本

# 确保Next.js应用已经构建
echo "===== 构建Next.js应用 ====="
npm run build

# 模拟服务器环境
echo "===== 创建测试目录 ====="
mkdir -p test-deploy/.next
cp -r .next/static test-deploy/.next/

# 启动测试服务
echo "===== 启动测试服务 ====="
echo "您可以通过访问 http://localhost:3001 来测试应用"
NODE_ENV=production PORT=3001 node .next/standalone/server.js 