'use client';

import { cn } from '@/lib/utils';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  className?: string;
}

export function ThreeColumnLayout({
  children,
  sidebarContent,
  className,
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      {/* 侧边栏容器 - 提高 z-index */}
      <div className="fixed inset-y-0 left-0 z-[1000]">
        {sidebarContent}
      </div>

      {/* 主内容区域 */}
      <div className="relative ml-[57px] transition-all duration-300 group-hover:ml-[207px]">
        {children}
      </div>
    </div>
  );
}