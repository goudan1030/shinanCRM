'use client';

import { cn } from '@/lib/utils';

interface FourColumnLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  middleContent?: React.ReactNode;
  filterContent?: React.ReactNode;
  className?: string;
}

export function FourColumnLayout({
  children,
  sidebarContent,
  middleContent,
  filterContent,
  className,
}: FourColumnLayoutProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      {/* 侧边栏容器 */}
      <div className="fixed inset-y-0 left-0 z-[1000]">
        {sidebarContent}
      </div>

      {/* 主内容区域 - 调整左侧边距 */}
      <div className="relative ml-[60px]">
        {children}
      </div>
    </div>
  );
} 