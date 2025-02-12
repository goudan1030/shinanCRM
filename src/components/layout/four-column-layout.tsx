'use client';

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

      {/* 二级菜单 */}
      <div className="fixed inset-y-0 left-[57px] w-[240px] z-[999] bg-white border-r transition-all duration-300 group-hover:left-[207px]">
        {middleContent}
      </div>

      {/* 筛选区域 */}
      <div className="fixed inset-y-0 left-[297px] w-[240px] z-[998] bg-white border-r transition-all duration-300 group-hover:left-[447px]">
        {filterContent}
      </div>

      {/* 主内容区域 */}
      <div className="relative transition-all duration-300 ml-[537px] group-hover:ml-[687px]">
        {children}
      </div>
    </div>
  );
} 