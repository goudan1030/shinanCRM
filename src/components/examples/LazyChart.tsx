import React from 'react';
import { lazyLoad, createSkeleton } from '@/lib/lazy-load';

// 创建图表骨架屏
const ChartSkeleton = createSkeleton('100%', 320);

// 懒加载Chart组件
const LazyChart = lazyLoad(
  () => import('@/components/examples/Chart'),
  { 
    fallback: <ChartSkeleton />,
    onLoad: () => console.log('图表组件加载完成')
  }
);

export default LazyChart; 