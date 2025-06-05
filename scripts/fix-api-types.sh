#!/bin/bash

# 修复Next.js 15 API路由类型问题
echo "修复Next.js 15 API路由类型问题..."

# 在服务器上执行
ssh root@8.149.244.105 << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 批量修复API路由类型..."

# 使用sed批量替换
find src/app/api -name "*.ts" -type f -exec sed -i 's/{ params }: { params: { id: string } }/context: { params: Promise<{ id: string }> }/g' {} \;

# 修复函数体开始部分，添加await params
find src/app/api -name "*.ts" -type f -exec sed -i '/context: { params: Promise<{ id: string }> }/a\  const params = await context.params;' {} \;

echo "2. 修复其他可能的params类型..."
find src/app/api -name "*.ts" -type f -exec sed -i 's/{ params }: { params: { action: string } }/context: { params: Promise<{ action: string }> }/g' {} \;

echo "3. 检查修复结果..."
grep -r "{ params }:" src/app/api/ --include="*.ts" | head -5 || echo "所有API路由已修复"

echo "4. 尝试重新构建..."
npm run build

EOT

echo "API类型修复完成" 