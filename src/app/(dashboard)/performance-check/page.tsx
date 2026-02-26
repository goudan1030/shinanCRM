'use client';

import { useState, useEffect } from 'react';
import { OptimizedImage } from '@/components/ui/optimized-image';
import dynamic from 'next/dynamic';

// 懒加载大型组件
const PerformanceMonitor = dynamic(
  () => import('@/components/utils/performance-monitor'),
  { 
    ssr: false,
    loading: () => <div className="p-4 bg-gray-100 rounded">加载性能监控组件...</div>
  }
);

export default function PerformanceCheckPage() {
  const [dbStats, setDbStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState<number | null>(null);
  
  // 模拟加载大量数据
  useEffect(() => {
    const startTime = performance.now();
    
    // 模拟API请求
    const fetchData = async () => {
      try {
        // 请求会员数据
        const res = await fetch('/api/members?pageSize=50');
        const data = await res.json();
        
        const endTime = performance.now();
        setLoadingTime(endTime - startTime);
        setDbStats(data);
        setIsLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // 测试缓存效果
  const testCachePerformance = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      // 再次请求相同的数据，应该会命中缓存
      const res = await fetch('/api/members?pageSize=50');
      const data = await res.json();
      
      const endTime = performance.now();
      setLoadingTime(endTime - startTime);
      setDbStats(data);
      setIsLoading(false);
    } catch (error) {
      console.error('加载数据失败:', error);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">系统性能检查</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">数据库性能</h2>
          
          <div className="mb-4">
            <button 
              onClick={testCachePerformance}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? '加载中...' : '测试缓存性能'}
            </button>
          </div>
          
          {loadingTime !== null && (
            <div className="mb-4">
              <p className="font-medium">加载时间: <span className={loadingTime > 500 ? 'text-red-500' : 'text-green-500'}>{loadingTime.toFixed(2)}ms</span></p>
              <p className="text-sm text-gray-500">
                {loadingTime < 100 ? '✅ 极快 - 缓存工作良好' : 
                 loadingTime < 300 ? '✅ 良好 - 性能正常' : 
                 loadingTime < 1000 ? '⚠️ 一般 - 可能需要优化' : 
                 '❌ 较慢 - 需要进一步优化'}
              </p>
            </div>
          )}
          
          {dbStats && (
            <div>
              <p>总记录数: {dbStats.total}</p>
              <p>当前页: {dbStats.page}</p>
              <p>每页数量: {dbStats.pageSize}</p>
              <p>数据条数: {dbStats.data.length}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">图片加载优化</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">优化后的图片</h3>
              <OptimizedImage
                src="https://picsum.photos/id/237/300/200"
                alt="优化后的图片"
                width={300}
                height={200}
                priority
              />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">标准图片</h3>
              <img 
                src="https://picsum.photos/id/238/300/200" 
                alt="标准图片"
                width={300}
                height={200}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">网页性能指标</h2>
        <PerformanceMonitor showInProduction={true} />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">性能优化建议</h2>
        
        <ul className="list-disc list-inside space-y-2">
          <li>启用数据库优化脚本: <code className="bg-gray-100 px-1">npm run db:optimize</code></li>
          <li>检查数据库索引: <code className="bg-gray-100 px-1">npm run db:check-indexes</code></li>
          <li>使用优化的图片组件: <code className="bg-gray-100 px-1">&lt;OptimizedImage /&gt;</code></li>
          <li>利用懒加载减少初始加载时间</li>
          <li>添加适当的缓存控制头</li>
          <li>利用服务器组件减少客户端JavaScript</li>
        </ul>
      </div>
    </div>
  );
} 