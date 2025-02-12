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

      {/* 中间栏 - 只在三栏布局时显示 */}
      {useThreeColumns && middleContent && (
        <div className="fixed inset-y-0 left-[57px] w-[240px] z-[999] bg-white border-r transition-all duration-300 group-hover:left-[207px]">
          {middleContent}
        </div>
      )}

      {/* 主内容区域 */}
      <div className={cn(
        "relative transition-all duration-300",
        useThreeColumns 
          ? "ml-[240px] group-hover:ml-[390px]"
          : "ml-[57px] group-hover:ml-[207px]"
      )}>
        {children}
      </div>
    </div>
  );
}