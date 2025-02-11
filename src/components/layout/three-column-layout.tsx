'use client';

import { cn } from '@/lib/utils';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  className?: string;
  sidebarContent?: React.ReactNode;
  middleContent?: React.ReactNode;
}

export function ThreeColumnLayout({
  children,
  className,
  sidebarContent,
  middleContent
}: ThreeColumnLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 左侧边栏 */}
      <div className="hidden md:block fixed left-0 top-0 h-[calc(100vh-0px)] w-[57px] bg-white border-r z-[5]">
        {sidebarContent}
      </div>

      {/* 中间功能区域 */}
      <div className="hidden md:block fixed left-[57px] top-0 h-[calc(100vh-0px)] w-[240px] bg-white border-r z-[5]">
        {middleContent}
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 overflow-hidden ml-0 md:ml-[297px] w-full">
        <div className={cn(
          "w-full h-full",
          className
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}