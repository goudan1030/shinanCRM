'use client';

import dynamic from 'next/dynamic';
import { Suspense, ComponentType, ComponentProps } from 'react';
import { Skeleton } from '../ui/skeleton';

/**
 * 组件懒加载工具
 * 
 * 用于优化大型组件的加载性能，减少初始包体积
 * 
 * @example
 * // 使用方法:
 * const DataTable = lazyLoad(() => import('@/components/data-table'));
 * 
 * // 在组件中使用:
 * <DataTable data={data} />
 */

export interface LoadingProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

const DefaultLoading = ({ height = '200px', width = '100%', className = '' }: LoadingProps) => (
  <div className={`flex items-center justify-center w-full ${className}`} style={{ height, width }}>
    <Skeleton className="w-full h-full" />
  </div>
);

/**
 * 创建懒加载组件
 * 
 * @param importFunc 异步导入组件的函数
 * @param LoadingComponent 加载中显示的组件
 * @param ssr 是否启用服务端渲染
 * @returns 懒加载包装后的组件
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  LoadingComponent: ComponentType<any> = DefaultLoading,
  ssr = false
) {
  const LazyComponent = dynamic(importFunc, {
    loading: () => <LoadingComponent />,
    ssr
  });

  // 返回带有Suspense包装的组件
  return function WrappedLazyComponent(props: ComponentProps<T>) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

export default lazyLoad; 