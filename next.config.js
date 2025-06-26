const path = require('path');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 禁用服务端组件重渲染以提高性能
  reactStrictMode: false,
  
  // 资源前缀配置，以支持子路径部署
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  
  // 先进的图片优化
  images: {
    domains: ['8.149.244.105'],
    unoptimized: true, // 在生产环境禁用图片优化以避免路径问题
    formats: ['image/avif', 'image/webp'], // 支持现代图片格式
    // 使用remotePatterns替代domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placeholder.com',
      },
      {
        protocol: 'http',
        hostname: '8.149.244.105',
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // 响应式图片尺寸
    minimumCacheTTL: 0, // 禁用图片缓存
    dangerouslyAllowSVG: true, // 允许SVG图片（小心使用）
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // 提高构建性能
  // output: 'standalone', // 在Netlify上使用默认输出模式
  
  // 开发阶段错误检查，生产环境忽略
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 压缩优化 - 移除不支持的swcMinify选项
  compiler: {
    // 移除console.log语句
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 构建优化 - 保留支持的实验性功能
  experimental: {
    // 部分实验性功能可能需要特定版本支持，如有问题请注释掉
    // optimizeCss: true, // CSS优化
    // optimizeServerReact: true, // 服务端React优化
    serverActions: {
      bodySizeLimit: '2mb', // 服务器动作的请求体大小限制
    },
    // 代码拆分优化
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lodash',
      'date-fns',
    ],
    // 增加静态资源预加载
    // optimisticClientCache: true, // 此功能可能不被支持
    // 添加Prefetch优化，通过预请求提高导航性能
    // prefetchThreshold: 1000, // 这个选项在当前版本不支持
    // 删除只有canary版本支持的ppr功能
    // ppr: true, 
    // 为客户端导航添加滑动动画
    scrollRestoration: true, // 启用滚动恢复功能
  },
  
  // 配置webpack
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    
    // 优化图片加载
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
      type: 'asset',
      generator: {
        filename: 'static/media/[hash][ext][query]'
      },
      parser: {
        dataUrlCondition: {
          maxSize: 10 * 1024, // 小于10KB的图片内联为base64
        },
      },
    });
    
    // 生产环境额外优化
    if (!dev) {
      // 添加压缩插件 (gzip, brotli)
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240, // 只压缩大于10kb的文件
          minRatio: 0.8, // 只有压缩率小于这个值的资源才会被处理
        }),
        new CompressionPlugin({
          filename: '[path][base].br',
          algorithm: 'brotliCompress',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
        })
      );
      
      // 启用生产环境的bundle分析(ANALYZE=true时)
      if (process.env.ANALYZE === 'true') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerPort: 8888,
            openAnalyzer: true,
          })
        );
      }
    }
    
    return config;
  },
  
  // 移除所有缓存策略，确保数据实时更新
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
          // 禁用所有缓存
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          // 预加载字体资源
          {
            key: 'Link',
            value: '</fonts/geist.woff2>; rel=preload; as=font; crossorigin=anonymous, </fonts/geist-mono.woff2>; rel=preload; as=font; crossorigin=anonymous',
          },
        ],
      },
    ];
  },
  
  // 重定向不需要的请求
  redirects: async () => {
    return [
      {
        source: '/service-worker.js',
        destination: '/_next/static/service-worker.js',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig 