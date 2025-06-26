'use client';

import React, { memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端遮罩层点击关闭侧边栏
  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={cn('min-h-screen relative', className)}>
      {/* 移动端遮罩层 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[999]"
          onClick={closeSidebar}
        />
      )}

      {/* 侧边栏容器 */}
      <div className={cn(
        "fixed inset-y-0 z-[1000] transition-transform duration-300 ease-in-out",
        // 桌面端：始终显示在左侧
        "lg:left-0 lg:translate-x-0",
        // 移动端：根据状态显示/隐藏
        isMobile ? (
          sidebarOpen ? "left-0 translate-x-0" : "left-0 -translate-x-full"
        ) : "left-0"
      )}>
        {sidebarContent && 
          React.cloneElement(sidebarContent as React.ReactElement, { 
            isMobile,
            sidebarOpen,
            setSidebarOpen 
          })
        }
      </div>

      {/* 中间栏容器 - 仅在三栏布局且非移动端时显示 */}
      {useThreeColumns && middleContent && !isMobile && (
        <div className="fixed inset-y-0 left-[57px] z-[999] w-[240px]">
          {middleContent}
        </div>
      )}

      {/* 主内容区域 - 响应式边距 */}
      <div className={cn(
        "relative transition-all duration-300 ease-in-out",
        // 移动端：无左边距
        "lg:ml-[60px]",
        // 桌面端：根据是否有中间栏调整左侧边距
        !isMobile && useThreeColumns && middleContent && "lg:ml-[297px]"
      )}>
        {/* 为子组件提供移动端控制方法 */}
        {React.cloneElement(children as React.ReactElement, { 
          isMobile,
          setSidebarOpen 
        })}
      </div>
    </div>
  );
});