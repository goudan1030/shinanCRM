'use client';

import { cn } from '@/lib/utils';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  middleContent?: React.ReactNode;
  className?: string;
  useThreeColumns?: boolean;
}

export function ThreeColumnLayout({
  children,
  sidebarContent,
  middleContent,
  className,
  useThreeColumns = false,
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      {/* 侧边栏容器 */}
      <div className="fixed inset-y-0 left-0 z-[1000]">
        {sidebarContent}
      </div>

      {/* 主内容区域 - 添加了适当的左侧边距 */}
      <div className="relative ml-[60px]">
        {children}
      </div>
    </div>
  );
}