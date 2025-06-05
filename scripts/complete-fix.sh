#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "=== 彻底修复Next.js缓存和构建问题 ==="

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

echo "1. 停止应用..."
pm2 stop sncrm

echo "2. 完全清除所有缓存..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

echo "3. 清除浏览器缓存头配置..."
# 修改next.config.js以禁用缓存
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // 禁用缓存
  generateEtags: false,
  
  // 自定义headers禁用缓存
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ];
  },

  // 强制生成新的文件名
  generateBuildId: async () => {
    return `build-${Date.now()}`
  }
}

module.exports = nextConfig
EOF

echo "4. 清理并重新安装依赖..."
npm cache clean --force
rm -rf node_modules
npm install

echo "5. 完全重新构建..."
npm run build

echo "6. 检查构建后的文件..."
ls -la .next/static/chunks/ | grep -E "(main-app|layout)" | head -5

echo "7. 启动应用..."
pm2 start npm --name "sncrm" -- start

sleep 5

echo "8. 检查应用状态..."
pm2 status

echo "9. 测试新的构建..."
curl -I http://localhost:3001/login

echo "10. 显示当前.env配置..."
cat .env.local

echo ""
echo "=========================================="
echo "完整修复完成！现在应该能正常访问了"
echo "=========================================="
echo "请清除浏览器缓存或使用隐身模式访问："
echo "http://crm.xinghun.info/login"
EOT

echo "修复完成，请测试网站" 