'use client';

import React from 'react';
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

      {/* 主内容区域 - 修复PC端宽度计算问题 */}
      <div className="relative w-[calc(100%-60px)] ml-[60px]">
        {children}
      </div>
    </div>
  );
} 