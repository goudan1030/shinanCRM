'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  ttfb: number;          // Time to First Byte
  fcp: number;           // First Contentful Paint
  lcp: number;           // Largest Contentful Paint
  fid: number | null;    // First Input Delay
  cls: number | null;    // Cumulative Layout Shift
  resourceLoading: {     // 资源加载时间
    css: number;
    js: number;
    img: number;
    fonts: number;
    other: number;
  };
  memoryUsage: number | null;  // 内存使用
  networkInfo: {
    effectiveType: string;  // 网络类型
    downlink: number;       // 网络下行速度
    rtt: number;            // 网络延迟
  } | null;
}

/**
 * 性能监控组件
 * 
 * 用于在开发环境中监控页面性能指标
 * 生产环境不会显示界面，但会收集数据
 */
export function PerformanceMonitor({ 
  showInProduction = false,
  onMetricsCollected
}: { 
  showInProduction?: boolean; 
  onMetricsCollected?: (metrics: PerformanceMetrics) => void;
}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleVisibility = () => setIsVisible(!isVisible);
  
  useEffect(() => {
    // 只在浏览器环境运行
    if (typeof window === 'undefined') return;
    
    // 默认在生产环境隐藏UI
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !showInProduction) {
      setIsVisible(false);
    }
    
    // 收集性能指标
    const collectPerformanceMetrics = () => {
      const performanceEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      // 资源加载时间
      const resourceEntries = performance.getEntriesByType('resource');
      const resourceLoading = {
        css: 0,
        js: 0,
        img: 0,
        fonts: 0,
        other: 0
      };
      
      resourceEntries.forEach((entry) => {
        const url = entry.name;
        const duration = entry.duration;
        
        if (url.endsWith('.css')) {
          resourceLoading.css += duration;
        } else if (url.endsWith('.js')) {
          resourceLoading.js += duration;
        } else if (/\.(png|jpg|jpeg|gif|svg|webp)/.test(url)) {
          resourceLoading.img += duration;
        } else if (/\.(woff|woff2|ttf|otf)/.test(url)) {
          resourceLoading.fonts += duration;
        } else {
          resourceLoading.other += duration;
        }
      });
      
      // 获取First Contentful Paint
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const fcp = fcpEntry ? fcpEntry.startTime : 0;
      
      // 获取Time to First Byte
      const ttfb = performanceEntries ? performanceEntries.responseStart - performanceEntries.requestStart : 0;
      
      // 网络信息
      let networkInfo = null;
      if ('connection' in navigator && navigator.connection) {
        const conn = navigator.connection as any;
        networkInfo = {
          effectiveType: conn.effectiveType || 'unknown',
          downlink: conn.downlink || 0,
          rtt: conn.rtt || 0
        };
      }
      
      // 内存使用情况
      let memoryUsage = null;
      if (performance && (performance as any).memory) {
        memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024); // 转换为MB
      }
      
      // 收集初始指标
      const initialMetrics: PerformanceMetrics = {
        ttfb,
        fcp,
        lcp: 0,  // 稍后通过PerformanceObserver获取
        fid: null,  // 稍后通过PerformanceObserver获取
        cls: null,  // 稍后通过PerformanceObserver获取
        resourceLoading,
        memoryUsage,
        networkInfo
      };
      
      setMetrics(initialMetrics);
      
      // 回调函数
      if (onMetricsCollected) {
        onMetricsCollected(initialMetrics);
      }
    };
    
    // 页面加载完成后收集基本指标
    window.addEventListener('load', collectPerformanceMetrics);
    
    // Web Vitals指标 (LCP, FID, CLS)需要使用PerformanceObserver
    if ('PerformanceObserver' in window) {
      // LCP观察器
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcp = lastEntry.startTime;
          
          setMetrics(prev => prev ? { ...prev, lcp } : null);
        });
        
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.error('LCP measurement error:', e);
      }
      
      // FID观察器
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const firstEntry = entries[0];
          const fid = firstEntry ? firstEntry.processingStart - firstEntry.startTime : null;
          
          setMetrics(prev => prev ? { ...prev, fid } : null);
        });
        
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        console.error('FID measurement error:', e);
      }
      
      // CLS观察器
      try {
        let clsValue = 0;
        let clsEntries = [];
        
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += (entry as any).value;
              clsEntries.push(entry);
            }
          });
          
          setMetrics(prev => prev ? { ...prev, cls: clsValue } : null);
        });
        
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.error('CLS measurement error:', e);
      }
    }
    
    return () => {
      window.removeEventListener('load', collectPerformanceMetrics);
    };
  }, [onMetricsCollected, showInProduction]);
  
  // 如果不显示或没有指标，不渲染任何内容
  if (!isVisible || !metrics) return (
    <button 
      onClick={toggleVisibility}
      className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg"
      title="显示性能指标"
    >
      📊
    </button>
  );
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/90 dark:bg-gray-800/90 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-md text-xs font-mono">
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">性能指标</h3>
        <button onClick={toggleVisibility} className="text-gray-500">✕</button>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded">
          <div className="font-semibold">TTFB</div>
          <div className={metrics.ttfb > 300 ? 'text-red-500' : 'text-green-500'}>
            {metrics.ttfb.toFixed(2)}ms
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded">
          <div className="font-semibold">FCP</div>
          <div className={metrics.fcp > 1800 ? 'text-red-500' : metrics.fcp > 1000 ? 'text-yellow-500' : 'text-green-500'}>
            {metrics.fcp.toFixed(2)}ms
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded">
          <div className="font-semibold">LCP</div>
          <div className={metrics.lcp > 2500 ? 'text-red-500' : metrics.lcp > 1800 ? 'text-yellow-500' : 'text-green-500'}>
            {metrics.lcp.toFixed(2)}ms
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded">
          <div className="font-semibold">CLS</div>
          <div className={metrics.cls && metrics.cls > 0.1 ? 'text-red-500' : 'text-green-500'}>
            {metrics.cls !== null ? metrics.cls.toFixed(3) : '计算中...'}
          </div>
        </div>
        
        <div className="col-span-2 bg-gray-100 dark:bg-gray-700 p-1 rounded">
          <div className="font-semibold">资源加载时间</div>
          <div className="grid grid-cols-5 gap-1 text-[10px]">
            <div>
              <div>JS</div>
              <div>{(metrics.resourceLoading.js / 1000).toFixed(2)}s</div>
            </div>
            <div>
              <div>CSS</div>
              <div>{(metrics.resourceLoading.css / 1000).toFixed(2)}s</div>
            </div>
            <div>
              <div>图片</div>
              <div>{(metrics.resourceLoading.img / 1000).toFixed(2)}s</div>
            </div>
            <div>
              <div>字体</div>
              <div>{(metrics.resourceLoading.fonts / 1000).toFixed(2)}s</div>
            </div>
            <div>
              <div>其他</div>
              <div>{(metrics.resourceLoading.other / 1000).toFixed(2)}s</div>
            </div>
          </div>
        </div>
        
        {metrics.networkInfo && (
          <div className="col-span-2 bg-gray-100 dark:bg-gray-700 p-1 rounded">
            <div className="font-semibold">网络状况</div>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <div>类型</div>
                <div>{metrics.networkInfo.effectiveType}</div>
              </div>
              <div>
                <div>速度</div>
                <div>{metrics.networkInfo.downlink}Mbps</div>
              </div>
              <div>
                <div>延迟</div>
                <div>{metrics.networkInfo.rtt}ms</div>
              </div>
            </div>
          </div>
        )}
        
        {metrics.memoryUsage && (
          <div className="col-span-2 bg-gray-100 dark:bg-gray-700 p-1 rounded">
            <div className="font-semibold">内存使用</div>
            <div>{metrics.memoryUsage.toFixed(2)}MB</div>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-[10px] text-gray-500">
        * TTFB: 首字节时间, FCP: 首次内容绘制, LCP: 最大内容绘制, CLS: 累积布局偏移
      </div>
    </div>
  );
}

export default PerformanceMonitor; 