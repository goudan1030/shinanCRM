/**
 * 组件懒加载工具
 * 提供多种懒加载策略，减少初始加载时间
 */

import React, { Suspense, lazy, ComponentType, useState, useEffect } from 'react';

// 懒加载选项接口
export interface LazyLoadOptions {
  fallback?: React.ReactNode;
  onLoad?: () => void;
  errorComponent?: React.ReactNode;
}

/**
 * 基本懒加载函数
 * 
 * @param importFunc 导入函数
 * @param options 懒加载选项
 * @returns 懒加载的组件
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);
  
  const { 
    fallback = <DefaultLoading />, 
    onLoad, 
    errorComponent = <DefaultError /> 
  } = options;
  
  // 包装组件，添加错误边界
  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    useEffect(() => {
      // 导入结束后调用onLoad回调
      if (onLoad) {
        importFunc().then(() => onLoad());
      }
    }, []);
    
    return (
      <ErrorBoundary fallback={errorComponent}>
        <Suspense fallback={fallback}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

/**
 * 视口内懒加载组件
 * 
 * 只有当组件进入视口时才会加载
 */
export function LazyViewport({ 
  children, 
  threshold = 0.1, 
  rootMargin = '100px',
  fallback = <DefaultLoading />,
  skipPreload = false
}: {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
  skipPreload?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  
  // 设置Intersection Observer
  useEffect(() => {
    if (!containerRef) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );
    
    observer.observe(containerRef);
    
    return () => {
      observer.disconnect();
    };
  }, [containerRef, threshold, rootMargin]);
  
  // 预加载处理
  useEffect(() => {
    if (skipPreload) return;
    
    // 如果支持requestIdleCallback，则在浏览器空闲时预加载
    if ('requestIdleCallback' in window) {
      const idleCallback = window.requestIdleCallback(
        () => {
          setIsPreloaded(true);
        },
        { timeout: 2000 } // 2秒超时
      );
      
      return () => {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallback);
        }
      };
    } else {
      // 回退到setTimeout
      const timeoutId = setTimeout(() => {
        setIsPreloaded(true);
      }, 5000); // 5秒后预加载
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [skipPreload]);
  
  // 预加载或可见时显示内容
  const shouldRender = isVisible || isPreloaded;
  
  return (
    <div ref={setContainerRef}>
      {shouldRender ? children : fallback}
    </div>
  );
}

/**
 * 创建延迟加载的骨架屏
 * 
 * @param width 宽度
 * @param height 高度
 * @returns 骨架屏组件
 */
export function createSkeleton(width: string | number, height: string | number) {
  return function Skeleton() {
    const skeletonStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      backgroundColor: 'var(--skeleton-bg, #f0f0f0)',
      borderRadius: 'var(--skeleton-radius, 0.375rem)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    };
    
    return (
      <div className="skeleton" style={skeletonStyle}>
        <style jsx global>{`
          @keyframes skeleton-pulse {
            0% {
              opacity: 0.6;
            }
            50% {
              opacity: 0.8;
            }
            100% {
              opacity: 0.6;
            }
          }
        `}</style>
      </div>
    );
  };
}

/**
 * 默认加载组件
 */
function DefaultLoading() {
  return (
    <div className="w-full h-10 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * 默认错误组件
 */
function DefaultError() {
  return (
    <div className="w-full p-4 text-center text-destructive bg-destructive/10 rounded-md">
      <p>加载组件时出错</p>
      <button 
        className="mt-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm"
        onClick={() => window.location.reload()}
      >
        刷新页面
      </button>
    </div>
  );
}

/**
 * 简单的错误边界组件
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('组件加载错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * 带有优先级的懒加载
 * 
 * 基于React.lazy，但提供指定加载优先级的能力
 */
export function priorityLazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions & { priority?: 'high' | 'medium' | 'low' } = {}
): React.ComponentType<React.ComponentProps<T>> {
  const { priority = 'medium', ...rest } = options;
  
  // 根据优先级确定预加载策略
  let timeoutMs = 0;
  
  switch (priority) {
    case 'high':
      // 高优先级：立即加载
      timeoutMs = 0;
      break;
    case 'medium':
      // 中优先级：稍后加载
      timeoutMs = 2000;
      break;
    case 'low':
      // 低优先级：空闲时加载
      timeoutMs = 5000;
      break;
  }
  
  // 预加载组件
  useEffect(() => {
    const timer = setTimeout(() => {
      // 在后台预加载组件
      importFunc().catch(err => {
        console.error('组件预加载失败:', err);
      });
    }, timeoutMs);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 使用基本的懒加载实现
  return lazyLoad(importFunc, rest);
}

/**
 * 预加载指定的组件
 * 
 * @param importFuncs 导入函数数组
 */
export function preloadComponents(importFuncs: Array<() => Promise<any>>): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        importFuncs.forEach(importFunc => {
          importFunc().catch(err => {
            console.error('组件预加载失败:', err);
          });
        });
      },
      { timeout: 2000 }
    );
  } else {
    // 回退到setTimeout
    setTimeout(() => {
      importFuncs.forEach(importFunc => {
        importFunc().catch(err => {
          console.error('组件预加载失败:', err);
        });
      });
    }, 2000);
  }
} 