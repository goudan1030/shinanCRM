'use client';

import { cn } from '@/lib/utils';

interface TwoColumnLayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebarContent?: React.ReactNode;
}

export function TwoColumnLayout({
  children,
  className,
  sidebarContent
}: TwoColumnLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧边栏 */}
      <div className="hidden md:block fixed left-0 top-0 h-[calc(100vh-0px)] w-[57px] bg-white border-r z-[5]">
        {sidebarContent}
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 overflow-hidden ml-0 md:ml-[57px] w-full">
        <div className={cn(
          "max-w-[1200px] w-full mx-auto h-full",
          className
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}