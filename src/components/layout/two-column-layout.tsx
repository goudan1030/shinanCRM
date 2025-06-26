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
    <div className="flex min-h-screen">
      {/* 左侧边栏 - 移动端隐藏 */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-[57px] bg-white border-r z-[5]">
        {sidebarContent}
      </div>

      {/* 右侧内容区域 - 移动端全宽，桌面端留边栏空间 */}
      <div className="flex-1 w-full ml-0 md:ml-[57px]">
        <div className={cn(
          "w-full max-w-none sm:max-w-[1200px] sm:mx-auto min-h-screen",
          className
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}