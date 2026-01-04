#!/bin/bash

# 修复 Next.js chunk 加载失败问题
# 使用方法: ./scripts/fix-chunk-loading-error.sh

echo "🔧 开始修复 Next.js chunk 加载失败问题..."

# 进入项目目录
cd /www/wwwroot/admin.xinghun.info || {
    echo "❌ 无法进入项目目录"
    exit 1
}

echo "📦 步骤 1: 清理旧的构建文件..."
rm -rf .next
rm -rf node_modules/.cache
echo "✅ 清理完成"

echo "📦 步骤 2: 重新安装依赖（如果需要）..."
# npm ci 或 npm install，根据实际情况选择
# npm ci --production=false

echo "📦 步骤 3: 重新构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

echo "✅ 构建完成"

echo "📦 步骤 4: 检查构建产物..."
if [ -d ".next/static/chunks" ]; then
    echo "✅ chunks 目录存在"
    echo "📊 chunks 文件数量:"
    find .next/static/chunks -name "*.js" | wc -l
else
    echo "❌ chunks 目录不存在，构建可能有问题"
    exit 1
fi

echo "📦 步骤 5: 检查合同创建页面的 chunk..."
if find .next/static/chunks -name "*contracts*create*" -o -name "*page-b753f3e716ffaf72*" 2>/dev/null | grep -q .; then
    echo "✅ 找到合同创建页面的 chunk 文件"
    find .next/static/chunks -name "*contracts*create*" -o -name "*page-b753f3e716ffaf72*" | head -3
else
    echo "⚠️  未找到特定 chunk，但可能使用了不同的 hash"
    echo "📋 所有 app 相关的 chunks:"
    find .next/static/chunks/app -name "*.js" 2>/dev/null | head -5
fi

echo "📦 步骤 6: 重启 PM2 应用..."
pm2 restart sncrm

echo "📦 步骤 7: 等待应用启动..."
sleep 3

echo "📦 步骤 8: 检查应用状态..."
pm2 status sncrm

echo "📦 步骤 9: 测试静态资源访问..."
STATIC_TEST=$(curl -I http://127.0.0.1:3001/_next/static/chunks/main-app.js 2>/dev/null | head -1)
if echo "$STATIC_TEST" | grep -q "200\|404"; then
    echo "✅ 静态资源可访问"
else
    echo "⚠️  静态资源访问可能有问题"
fi

echo ""
echo "✅ 修复完成！"
echo ""
echo "📝 后续操作建议："
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete 或 Cmd+Shift+Delete）"
echo "2. 硬刷新页面（Ctrl+F5 或 Cmd+Shift+R）"
echo "3. 如果问题仍然存在，检查 Nginx 配置是否正确代理了 /_next/static/ 路径"
echo ""
echo "🔍 检查 Nginx 配置："
echo "   location /_next/static/ {"
echo "       proxy_pass http://127.0.0.1:3001;"
echo "       proxy_set_header Host \$host;"
echo "   }"
