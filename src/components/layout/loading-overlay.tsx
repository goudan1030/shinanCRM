'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function LoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  // 监听路由变化，显示加载状态
  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => {
      setTimeout(() => setIsLoading(false), 300); // 稍微延迟隐藏加载状态，让过渡更自然
    };

    // 添加全局导航事件监听
    window.addEventListener('beforeunload', handleStart);
    window.addEventListener('load', handleComplete);
    
    // 在组件卸载时移除事件监听
    return () => {
      window.removeEventListener('beforeunload', handleStart);
      window.removeEventListener('load', handleComplete);
    };
  }, []);
  
  // 当路由变化时，显示加载状态
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);
  
  if (!isLoading) return null;
  
  return (
    <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[9999] flex items-center justify-center pointer-events-none transition-opacity duration-300">
      <div className="bg-white rounded-lg p-4 shadow-lg flex items-center space-x-3">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p className="text-sm text-gray-700">正在加载...</p>
      </div>
    </div>
  );
} 