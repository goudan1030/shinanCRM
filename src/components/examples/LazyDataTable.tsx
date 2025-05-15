import { lazyLoad, createSkeleton } from '@/lib/lazy-load';

// 创建骨架屏
const TableSkeleton = createSkeleton('100%', 400);

// 懒加载DataTable组件
const LazyDataTable = lazyLoad(
  () => import('@/components/examples/DataTable'),
  { fallback: <TableSkeleton /> }
);

export default LazyDataTable; 