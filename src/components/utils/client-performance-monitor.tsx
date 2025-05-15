'use client';

import dynamic from 'next/dynamic';

// 在客户端组件中使用dynamic导入
const PerformanceMonitor = dynamic(
  () => import('./performance-monitor'),
  { ssr: false }
);

export default function ClientPerformanceMonitor() {
  return <PerformanceMonitor />;
} 