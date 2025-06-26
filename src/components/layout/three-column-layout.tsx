'use client';

import { cn } from '@/lib/utils';
import { memo } from 'react';

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  middleContent?: React.ReactNode;
  className?: string;
  useThreeColumns?: boolean;
}

// 使用memo优化组件，减少不必要的重渲染
export const ThreeColumnLayout = memo(function ThreeColumnLayout({
  children,
  sidebarContent,
  middleContent,
  className,
  useThreeColumns = false,
}: ThreeColumnLayoutProps) {
  return (
    <div className={cn('min-h-screen', className)}>
      {/* 侧边栏容器 - 在移动端隐藏 */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-[1000]">
        {sidebarContent}
      </div>

      {/* 中间栏容器 - 仅在三栏布局时显示，移动端隐藏 */}
      {useThreeColumns && middleContent && (
        <div className="hidden lg:block fixed inset-y-0 left-[57px] z-[999] w-[240px]">
          {middleContent}
        </div>
      )}

      {/* 主内容区域 - 移动端全宽，桌面端有边距 */}
      <div className={cn(
        "relative w-full", 
        // 移动端无边距，桌面端根据布局调整边距
        "ml-0 md:ml-[60px]",
        useThreeColumns && middleContent ? "lg:ml-[297px]" : "",
        "transition-all duration-100 ease-in-out"
      )}>
        {children}
      </div>
    </div>
  );
});