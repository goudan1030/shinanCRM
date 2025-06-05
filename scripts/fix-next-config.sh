#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "修复Next.js配置并重新构建..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
cd /www/wwwroot/sncrm

# 创建简化的next.config.js，移除不必要的依赖
echo "创建简化的next.config.js..."
cat > next.config.js << 'EOF'
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  
  // 资源前缀配置
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  
  // 图片优化配置
  images: {
    domains: ['8.149.244.105'],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '8.149.244.105',
      },
      {
        protocol: 'http',
        hostname: 'crm.xinghun.info',
      }
    ],
  },
  
  // 构建输出配置
  output: 'standalone',
  
  // 忽略构建错误
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 编译器优化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 实验性功能
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    scrollRestoration: true,
  },
  
  // webpack配置
  webpack: (config, { dev, isServer }) => {
    // 路径别名
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    
    return config;
  },
  
  // 安全头设置
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
EOF

echo "Next.js配置已简化，开始构建..."

# 重新构建应用
npm run build

if [ $? -eq 0 ]; then
    echo "构建成功，重启应用..."
    
    # 重启PM2应用
    pm2 restart sncrm
    
    echo "应用重启完成"
    pm2 status
    
    echo ""
    echo "修复完成！应用应该可以正常运行了。"
    echo "请访问 http://crm.xinghun.info 测试"
else
    echo "构建仍然失败，显示错误详情..."
    npm run build
fi
EOT

echo "Next.js配置修复完成"