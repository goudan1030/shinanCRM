'use client';

/**
 * 懒加载示例页面
 * 
 * 演示如何使用懒加载组件优化性能
 */
import React, { useState } from 'react';
import { lazyLoad, LazyViewport, priorityLazyLoad, preloadComponents } from '@/lib/lazy-load';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 创建一个表格骨架屏
const TableSkeleton = createSkeleton('100%', 400);

// 懒加载大型组件
const LazyDataTable = lazyLoad(
  () => import('@/components/examples/DataTable'),
  { fallback: <TableSkeleton /> }
);

// 懒加载图表组件
const LazyChart = lazyLoad(
  () => import('@/components/examples/Chart'),
  { fallback: <div className="w-full h-64 animate-pulse bg-muted rounded" /> }
);

// 默认预加载的富文本编辑器
const LazyEditor = lazyLoad(
  () => import('@/components/examples/RichTextEditor'),
  { 
    fallback: <div className="w-full h-64 animate-pulse bg-muted rounded" />,
    preload: true // 预加载此组件
  }
);

// 优先级懒加载
const HighPriorityComponent = priorityLazyLoad(
  () => import('@/components/examples/Chart'),
  { priority: 'high' }
);

const MediumPriorityComponent = priorityLazyLoad(
  () => import('@/components/examples/DataTable'),
  { priority: 'medium' }
);

const LowPriorityComponent = priorityLazyLoad(
  () => import('@/components/examples/RichTextEditor'),
  { priority: 'low' }
);

export default function LazyLoadingExamplePage() {
  const [showEditor, setShowEditor] = useState(false);
  const [showOnDemand, setShowOnDemand] = useState(false);
  
  // 预加载组件
  const handlePreload = () => {
    preloadComponents([
      () => import('@/components/examples/DataTable'),
      () => import('@/components/examples/Chart')
    ]);
    alert('组件已开始在后台预加载');
  };
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">懒加载演示</h1>
      <p className="text-muted-foreground mb-8">
        此页面展示了不同的组件懒加载策略，帮助减少初始加载时间并提升性能。
      </p>
      
      <Tabs defaultValue="basic">
        <TabsList className="mb-6">
          <TabsTrigger value="basic">基本懒加载</TabsTrigger>
          <TabsTrigger value="viewport">视口内懒加载</TabsTrigger>
          <TabsTrigger value="priority">优先级懒加载</TabsTrigger>
          <TabsTrigger value="ondemand">按需加载</TabsTrigger>
        </TabsList>
        
        {/* 基本懒加载 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本懒加载</CardTitle>
              <CardDescription>
                使用 React.lazy 和 Suspense 实现的基本懒加载，组件会在首次渲染时加载。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-10">
                <LazyDataTable rows={10} />
                <LazyChart />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 视口内懒加载 */}
        <TabsContent value="viewport">
          <Card>
            <CardHeader>
              <CardTitle>视口内懒加载</CardTitle>
              <CardDescription>
                组件只在滚动到视图内时才会加载，节省资源并加快初始页面加载。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-20">
                <div>
                  <p className="mb-4 font-semibold">这个组件是立即加载的:</p>
                  <LazyDataTable rows={5} />
                </div>
                
                <div>
                  <p className="mb-4 font-semibold">向下滚动查看视口内懒加载的组件:</p>
                </div>
                
                <LazyViewport>
                  <div>
                    <p className="mb-2 text-muted-foreground">这个图表组件仅在滚动到视图内时加载:</p>
                    <LazyChart />
                  </div>
                </LazyViewport>
                
                <LazyViewport>
                  <div>
                    <p className="mb-2 text-muted-foreground">这个富文本编辑器组件也是仅在滚动到视图内时加载:</p>
                    <LazyEditor />
                  </div>
                </LazyViewport>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 优先级懒加载 */}
        <TabsContent value="priority">
          <Card>
            <CardHeader>
              <CardTitle>优先级懒加载</CardTitle>
              <CardDescription>
                基于优先级的懒加载，高优先级组件优先加载，低优先级组件延后加载。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">高优先级 (立即加载)</h3>
                  <HighPriorityComponent />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">中优先级 (延迟2秒加载)</h3>
                  <MediumPriorityComponent rows={5} />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">低优先级 (延迟5秒加载)</h3>
                  <LowPriorityComponent />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 按需加载 */}
        <TabsContent value="ondemand">
          <Card>
            <CardHeader>
              <CardTitle>按需加载</CardTitle>
              <CardDescription>
                组件仅在用户明确请求时才加载，非常适合不常用的大型组件。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex space-x-4">
                  <Button onClick={() => setShowOnDemand(true)}>
                    加载组件
                  </Button>
                  <Button variant="outline" onClick={handlePreload}>
                    预加载组件
                  </Button>
                </div>
                
                {showOnDemand && (
                  <div className="space-y-6">
                    <LazyEditor />
                    <LazyDataTable rows={10} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 