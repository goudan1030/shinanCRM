import type { Metadata, Viewport } from "next";
import { RootLayout } from '@/components/layout/root-layout';
import { AuthProvider } from '@/contexts/auth-context';
import { fontVariables } from '@/lib/fonts';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import ClientPerformanceMonitor from '@/components/utils/client-performance-monitor';

// 为视口和主题颜色添加单独的配置
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: "SNCRM - 客户关系管理系统",
  description: "一个现代化的客户关系管理系统",
  // 移除了viewport和themeColor配置
  // 添加缓存控制元标签
  other: {
    'cache-control': 'public, max-age=3600, s-maxage=86400',
  },
  // 添加PWA支持相关元数据
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SNCRM',
  },
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={fontVariables}>
      <head>
        {/* 预连接到Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 预连接到第三方域名 */}
        <link rel="preconnect" href="https://cdn.example.com" />
      </head>
      <body className="antialiased">
        <RootLayout>
          <AuthProvider>{children}</AuthProvider>
        </RootLayout>
        <Toaster />
        {/* 将性能监控改为通过客户端组件实现 */}
        {process.env.NODE_ENV === 'development' && <ClientPerformanceMonitor />}
      </body>
    </html>
  );
}
