'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * 页面切换加载指示器
 * 在路由切换时显示加载状态，提升用户体验
 */
export function PageTransition() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 路由切换时显示加载状态
    setIsLoading(true);
    
    // 短暂延迟后隐藏，给用户反馈
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-[48px] left-0 right-0 h-1 bg-transparent z-[100] pointer-events-none">
      <div className="h-full bg-primary animate-pulse w-[30%]" />
    </div>
  );
}

