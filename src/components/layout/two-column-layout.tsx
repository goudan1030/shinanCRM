'use client';

import React from 'react';
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

      {/* 右侧内容区域 - 修复PC端宽度计算问题 */}
      <div className="w-full md:w-[calc(100%-57px)] md:ml-[57px]">
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