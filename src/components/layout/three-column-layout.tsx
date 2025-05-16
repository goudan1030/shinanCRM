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
      {/* 侧边栏容器 */}
      <div className="fixed inset-y-0 left-0 z-[1000]">
        {sidebarContent}
      </div>

      {/* 中间栏容器 - 仅在三栏布局时显示 */}
      {useThreeColumns && middleContent && (
        <div className="fixed inset-y-0 left-[57px] z-[999] w-[240px]">
          {middleContent}
        </div>
      )}

      {/* 主内容区域 - 根据是否有中间栏调整左侧边距 */}
      <div className={cn(
        "relative", 
        useThreeColumns && middleContent ? "ml-[297px]" : "ml-[60px]",
        "transition-all duration-100 ease-in-out" // 添加过渡效果
      )}>
        {children}
      </div>
    </div>
  );
});