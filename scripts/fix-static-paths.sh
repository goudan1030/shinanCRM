#!/bin/bash

# 设置变量
SERVER_IP="8.149.244.105"
SERVER_USER="root"

echo "开始修复Next.js静态资源路径问题..."

# 远程执行命令
ssh $SERVER_USER@$SERVER_IP << 'EOT'
# 进入项目目录
cd /www/wwwroot/sncrm

# 更新next.config.js以添加静态资源配置
echo "更新Next.js配置..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // 确保静态资源路径正确
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  // 确保使用正确的基础路径
  basePath: '',
  // 禁用 x-powered-by 头信息
  poweredByHeader: false,
  // 图像优化配置
  images: {
    domains: ['crm.xinghun.info'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // 使用默认图片加载器
    loader: 'default',
  },
  // 确保能正确解析 .ts 和 .tsx 文件
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // 添加自定义脚本和样式文件
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // 配置静态导出目录
  distDir: '.next',
  env: {
    NEXTAUTH_URL: 'http://crm.xinghun.info',
    API_URL: 'http://crm.xinghun.info/api',
  },
  // 配置页面重载
  onDemandEntries: {
    // 为开发环境进行配置
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 5,
  },
  compiler: {
    // 移除生产环境中的 console.log 和 debugger 语句
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

module.exports = nextConfig;
EOF

# 创建.env.production文件
echo "创建生产环境变量文件..."
cat > .env.production << 'EOF'
# 生产环境变量
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://crm.xinghun.info/api
EOF

# 创建公共文件夹，确保存在
echo "确保公共文件夹存在..."
mkdir -p public/fonts
mkdir -p public/images

# 确保字体文件存在
echo "创建默认字体文件..."
touch public/fonts/geist.woff2
touch public/fonts/geist-mono.woff2

# 创建自定义文档组件
echo "创建自定义文档组件..."
mkdir -p pages
cat > pages/_document.tsx << 'EOF'
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh">
      <Head>
        <link rel="preload" href="/fonts/geist.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/geist-mono.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <style>{`
          @font-face {
            font-family: 'Geist';
            src: url('/fonts/geist.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Geist Mono';
            src: url('/fonts/geist-mono.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
EOF

# 更新_app.tsx文件
echo "更新_app.tsx文件..."
cat > pages/_app.tsx << 'EOF'
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  useEffect(() => {
    // 记录页面加载和路由变化
    console.log('页面加载:', router.pathname);
    
    const handleRouteChange = (url: string) => {
      console.log('路由变化:', url);
    };
    
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);
  
  return <Component {...pageProps} />;
}
EOF

# 确保styles目录存在
echo "创建样式文件..."
mkdir -p styles
cat > styles/globals.css << 'EOF'
/* 全局样式 */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: rgb(var(--background-rgb));
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
}

code {
  font-family: 'Geist Mono', Menlo, Monaco, Consolas, 'Courier New', monospace;
}
EOF

# 重新构建项目
echo "重新构建项目..."
npm run build

# 重启应用
echo "重启应用..."
pm2 restart sncrm

# 重载Nginx
echo "重载Nginx配置..."
nginx -s reload

echo "静态路径问题修复完成。"
EOT

echo "静态资源路径修复脚本已运行。"
echo "请完全清除浏览器缓存后再次访问 http://crm.xinghun.info 测试。" 