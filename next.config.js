const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // 禁用图片优化以支持 Netlify
    domains: ['placeholder.com'], // 如果还需要使用占位图片
  },
  output: 'standalone', // 使用独立输出模式
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生产构建时忽略类型检查错误
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
    };
    return config;
  },
}

module.exports = nextConfig 