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
    <>
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

      {/* 主内容区域 - 简化布局，直接可滚动 */}
      <div 
        className={cn(
          // 移动端：全宽
          "w-full",
          // 桌面端：使用calc计算正确宽度，避免超出屏幕
          "md:w-[calc(100%-60px)] md:ml-[60px]",
          // 三栏布局时的宽度计算
          useThreeColumns && middleContent ? "lg:w-[calc(100%-297px)] lg:ml-[297px]" : "",
          "transition-all duration-100 ease-in-out",
          className
        )}
        style={{ height: 'auto', overflow: 'visible', minHeight: '100vh' }}
      >
        {children}
      </div>
    </>
  );
});