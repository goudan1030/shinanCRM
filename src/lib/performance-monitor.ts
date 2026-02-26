/**
 * 前端性能监控工具
 * 
 * 收集和报告关键性能指标(Core Web Vitals)，用于监控应用性能
 * 包括:
 * - LCP (Largest Contentful Paint) - 最大内容绘制，衡量加载性能
 * - FID (First Input Delay) - 首次输入延迟，衡量交互性能
 * - CLS (Cumulative Layout Shift) - 累积布局偏移，衡量视觉稳定性
 * - TTFB (Time to First Byte) - 首字节时间，衡量服务器响应时间
 * - INP (Interaction to Next Paint) - 交互到下一次绘制，衡量交互响应性
 * - 资源加载性能 - 监控API请求、图片和脚本加载时间
 * - 内存使用情况 - 监控页面内存使用情况
 * - JavaScript执行时间 - 监控耗时操作
 * 
 * 使用说明:
 * 1. 在_app.tsx中的useEffect钩子中调用initPerformanceMonitoring()
 * 2. 使用markPerformance和measurePerformance记录自定义指标
 * 3. 使用reportResourceTiming和reportCustomMetric上报自定义指标
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetric {
  name: string;         // 指标名称
  value: number;        // 指标值
  page: string;         // 页面路径
  timestamp?: number;   // 时间戳
  userAgent?: string;   // 用户代理
  connection?: string;  // 网络连接类型
}

/**
 * 性能指标类型
 */
type PerformanceMetricName = 
  | 'LCP' // Largest Contentful Paint
  | 'FID' // First Input Delay
  | 'CLS' // Cumulative Layout Shift
  | 'TTFB' // Time To First Byte
  | 'INP' // Interaction to Next Paint
  | 'FCP' // First Contentful Paint
  | 'DCL' // DOMContentLoaded
  | 'L' // Load
  | 'ResourceLoad' // 资源加载
  | 'ApiCall' // API调用
  | 'MemoryUsage' // 内存使用
  | 'LongTask' // 长任务
  | 'Custom'; // 自定义指标

/**
 * 性能数据接口
 */
interface PerformanceMetricData {
  name: PerformanceMetricName;
  value: number;
  page: string;
  resourceUrl?: string;
  connectionInfo?: string;
  timestamp: string;
}

/**
 * 初始化性能监控
 * 
 * 在客户端开始收集性能指标
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;
  
  // 收集页面加载性能数据
  window.addEventListener('load', () => {
    // 使用requestIdleCallback等待浏览器空闲时收集数据
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        collectNavigationTiming();
      });
    } else {
      // 降级处理
      setTimeout(() => collectNavigationTiming(), 1000);
    }
  });
  
  // 监控TTFB (Time to First Byte)
  const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navigationEntries.length > 0) {
    const metric = {
      name: 'TTFB',
      value: navigationEntries[0].responseStart - navigationEntries[0].requestStart,
      page: window.location.pathname,
    };
    reportPerformanceMetric(metric);
  }
  
  // 监控FID (First Input Delay)
  try {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const metric = {
          name: 'FID',
          value: (entry as any).processingStart - (entry as any).startTime,
          page: window.location.pathname,
        };
        reportPerformanceMetric(metric);
      }
    }).observe({type: 'first-input', buffered: true});
  } catch (e) {
    console.error('FID监控失败:', e);
  }
  
  // 监控LCP (Largest Contentful Paint)
  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      const metric = {
        name: 'LCP',
        value: (lastEntry as any).startTime,
        page: window.location.pathname,
      };
      reportPerformanceMetric(metric);
    }).observe({type: 'largest-contentful-paint', buffered: true});
  } catch (e) {
    console.error('LCP监控失败:', e);
  }
  
  // 监控CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    let clsEntries = [];
    
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // 只累计没有最近用户输入的布局偏移
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      }
      
      // 发送最终的CLS值
      const metric = {
        name: 'CLS',
        value: clsValue,
        page: window.location.pathname,
      };
      reportPerformanceMetric(metric);
    }).observe({type: 'layout-shift', buffered: true});
  } catch (e) {
    console.error('CLS监控失败:', e);
  }
  
  // 监控资源加载性能
  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if ((entry as PerformanceResourceTiming).initiatorType === 'fetch' || 
            (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest') {
          // 只监控API请求
          const metric = {
            name: 'API_TIMING',
            value: entry.duration,
            page: window.location.pathname,
            url: (entry as PerformanceResourceTiming).name
          };
          reportPerformanceMetric(metric);
        }
      });
    }).observe({type: 'resource', buffered: true});
  } catch (e) {
    console.error('资源监控失败:', e);
  }
}

/**
 * 收集导航计时指标
 */
function collectNavigationTiming() {
  const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!navigationEntries.length) return;
  
  const navigationTiming = navigationEntries[0];
  
  // 收集关键时间
  const metrics = [
    {
      name: 'DNS',
      value: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart
    },
    {
      name: 'TCP',
      value: navigationTiming.connectEnd - navigationTiming.connectStart
    },
    {
      name: 'TLS',
      value: navigationTiming.secureConnectionStart > 0 ? 
             navigationTiming.connectEnd - navigationTiming.secureConnectionStart : 0
    },
    {
      name: 'TTFB',
      value: navigationTiming.responseStart - navigationTiming.requestStart
    },
    {
      name: 'Download',
      value: navigationTiming.responseEnd - navigationTiming.responseStart
    },
    {
      name: 'DOMContentLoaded',
      value: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart
    },
    {
      name: 'DOMComplete',
      value: navigationTiming.domComplete
    },
    {
      name: 'Load',
      value: navigationTiming.loadEventEnd - navigationTiming.loadEventStart
    },
    {
      name: 'TotalPageLoad',
      value: navigationTiming.loadEventEnd
    }
  ];
  
  // 获取网络信息
  let connectionInfo = '';
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      connectionInfo = `${conn.effectiveType || ''} - ${conn.downlink || ''}Mbps - RTT:${conn.rtt || ''}ms`;
    }
  }
  
  // 上报所有指标
  metrics.forEach(metric => {
    reportPerformanceMetric({
      ...metric,
      page: window.location.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: connectionInfo
    });
  });
}

/**
 * 上报性能指标到服务器
 */
function reportPerformanceMetric(metric: PerformanceMetric): void {
  // 在控制台显示指标（开发模式）
  if (process.env.NODE_ENV === 'development') {
    console.log('性能指标:', metric);
  }
  
  // 使用 SendBeacon API (如果可用)，更可靠地发送数据
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(metric)], { type: 'application/json' });
    navigator.sendBeacon('/api/performance-metrics', blob);
  } else {
    // 退回到fetch API
    fetch('/api/performance-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      // keepalive确保即使页面关闭请求也能完成
      keepalive: true
    }).catch(err => console.error('性能数据上报失败:', err));
  }
  
  // 发送到监控服务（如果在生产环境）
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    (window as any).gtag('event', 'performance_metric', {
      event_category: 'Performance',
      event_label: metric.name,
      value: Math.round(metric.value),
      page: metric.page,
      non_interaction: true
    });
  }
}

/**
 * 在特定时间点手动标记性能指标
 */
export function markPerformance(name: string): void {
  if (typeof window === 'undefined' || !window.performance) return;
  
  try {
    performance.mark(name);
    console.log(`性能标记: ${name}`);
  } catch (e) {
    console.error('创建性能标记失败:', e);
  }
}

/**
 * 测量两个标记点之间的性能
 */
export function measurePerformance(name: string, startMark: string, endMark: string): number {
  if (typeof window === 'undefined' || !window.performance) return 0;
  
  try {
    performance.measure(name, startMark, endMark);
    const measures = performance.getEntriesByName(name, 'measure');
    const duration = measures[0].duration;
    
    reportPerformanceMetric({
      name: `MEASURE_${name}`,
      value: duration,
      page: window.location.pathname
    });
    
    return duration;
  } catch (e) {
    console.error('测量性能失败:', e);
    return 0;
  }
}

// 自动初始化性能监控（在客户端）
if (typeof window !== 'undefined') {
  // 使用setTimeout确保在页面加载后初始化
  setTimeout(() => {
    initPerformanceMonitoring();
  }, 0);
}

/**
 * 监控交互到下一次绘制 (INP) 
 * 这是Google推出的新性能指标，用于测量页面交互响应性
 */
export function monitorINP() {
  if (typeof window === 'undefined') return;
  
  try {
    // 检查浏览器是否支持PerformanceObserver和INP指标
    if ('PerformanceObserver' in window) {
      // 尝试监控INP
      try {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            // INP还在实验阶段，所以需要进行类型检查
            if (entry.entryType === 'event') {
              const metric = {
                name: 'INP',
                value: (entry as any).processingTime || (entry as any).duration,
                page: window.location.pathname,
              };
              reportPerformanceMetric(metric);
            }
          }
        }).observe({ type: 'event', buffered: true } as any);
      } catch (e) {
        console.log('INP监控不可用:', e);
      }
    }
  } catch (e) {
    console.error('监控INP失败:', e);
  }
}

/**
 * 监控内存使用情况
 */
export function monitorMemoryUsage() {
  if (typeof window === 'undefined') return;
  
  // 内存信息收集间隔（毫秒）
  const MEMORY_INTERVAL = 30000; // 30秒
  
  const collectMemoryInfo = () => {
    // 检查是否支持内存API
    if ('performance' in window && 'memory' in (performance as any)) {
      const memoryInfo = (performance as any).memory;
      
      const metric = {
        name: 'MEMORY_USAGE',
        value: memoryInfo.usedJSHeapSize / (1024 * 1024), // 转换为MB
        page: window.location.pathname,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit / (1024 * 1024),
        totalJSHeapSize: memoryInfo.totalJSHeapSize / (1024 * 1024)
      };
      
      reportPerformanceMetric(metric);
    }
  };
  
  // 初始收集
  collectMemoryInfo();
  
  // 周期性收集
  setInterval(collectMemoryInfo, MEMORY_INTERVAL);
}

/**
 * 监控长任务（耗时超过50ms的任务）
 */
export function monitorLongTasks() {
  if (typeof window === 'undefined') return;
  
  try {
    // 检查浏览器是否支持长任务API
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const metric = {
              name: 'LONG_TASK',
              value: entry.duration,
              page: window.location.pathname,
              taskName: (entry as any).name || 'unknown'
            };
            reportPerformanceMetric(metric);
          }
        }).observe({ type: 'longtask', buffered: true } as any);
      } catch (e) {
        console.log('长任务监控不可用:', e);
      }
    }
  } catch (e) {
    console.error('监控长任务失败:', e);
  }
}

/**
 * 上报自定义指标
 */
export function reportCustomMetric(name: string, value: number, additionalData: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  
  const metric = {
    name,
    value,
    page: window.location.pathname,
    ...additionalData
  };
  
  reportPerformanceMetric(metric);
}

/**
 * 初始化所有性能监控
 */
export function initAllPerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // 初始化基本性能监控
  initPerformanceMonitoring();
  
  // 初始化INP监控
  monitorINP();
  
  // 初始化内存使用监控
  monitorMemoryUsage();
  
  // 初始化长任务监控
  monitorLongTasks();
}

/**
 * 监控核心Web指标
 */
function monitorCoreWebVitals(): void {
  try {
    // 确保PerformanceObserver在浏览器中可用
    if (!('PerformanceObserver' in window)) return;
    
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportPerformanceMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        reportPerformanceMetric({
          name: 'FID',
          value: (entry as PerformanceEventTiming).processingStart - entry.startTime,
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    
    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        // 只有不带用户输入的布局偏移才计入CLS
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          clsEntries.push(entry);
        }
      });
      
      // 定期报告累积的CLS值
      reportPerformanceMetric({
        name: 'CLS',
        value: clsValue,
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    
    // TTFB (Time to First Byte)
    const navigationObserver = new PerformanceObserver((entryList) => {
      const navigationEntry = entryList.getEntries()[0] as PerformanceNavigationTiming;
      reportPerformanceMetric({
        name: 'TTFB',
        value: navigationEntry.responseStart - navigationEntry.requestStart,
        page: window.location.pathname,
        timestamp: new Date().toISOString()
      });
    });
    navigationObserver.observe({ type: 'navigation', buffered: true });
    
    // INP (Interaction to Next Paint)
    const inpObserver = new PerformanceObserver((entryList) => {
      const events = entryList.getEntries();
      events.forEach(event => {
        // 计算INP (在Chrome 90+中可用)
        const duration = (event as any).duration || (event as any).processingEnd - event.startTime;
        if (duration > 50) { // 只报告较长交互
          reportPerformanceMetric({
            name: 'INP',
            value: duration,
            page: window.location.pathname,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    inpObserver.observe({ type: 'event', durationThreshold: 16 });
    
  } catch (error) {
    console.error('监控Core Web Vitals失败:', error);
  }
}

/**
 * 监控网络信息
 */
function monitorNetworkInformation(): void {
  try {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      // 记录初始网络状态
      const getConnectionInfo = () => {
        return `${connection.effectiveType}, ${connection.downlink}Mbps, RTT: ${connection.rtt}ms`;
      };
      
      // 监听网络变化
      connection.addEventListener('change', () => {
        console.log(`网络状态变化: ${getConnectionInfo()}`);
      });
    }
  } catch (error) {
    console.error('监控网络信息失败:', error);
  }
}

/**
 * 监控资源加载性能
 */
function monitorResourceLoading(): void {
  try {
    const resourceObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const resource = entry as PerformanceResourceTiming;
        
        // 只监控大型资源或加载较慢的资源
        if (resource.duration > 500 || resource.transferSize > 500000) {
          reportPerformanceMetric({
            name: 'ResourceLoad',
            value: resource.duration,
            page: window.location.pathname,
            resourceUrl: resource.name,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    resourceObserver.observe({ type: 'resource', buffered: true });
  } catch (error) {
    console.error('监控资源加载性能失败:', error);
  }
}

/**
 * 监控内存使用情况
 */
function monitorMemoryUsage(): void {
  try {
    if (performance.memory) {
      // 每30秒检查一次内存使用
      setInterval(() => {
        const memoryInfo = performance.memory;
        const memoryUsage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
        
        reportPerformanceMetric({
          name: 'MemoryUsage',
          value: memoryUsage,
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        });
        
        // 内存使用超过80%警告
        if (memoryUsage > 80) {
          console.warn(`内存使用率高: ${memoryUsage.toFixed(2)}%`);
        }
      }, 30000);
    }
  } catch (error) {
    console.error('监控内存使用情况失败:', error);
  }
}

/**
 * 监控长任务
 */
function monitorLongTasks(): void {
  try {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        reportPerformanceMetric({
          name: 'LongTask',
          value: entry.duration,
          page: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      });
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (error) {
    console.error('监控长任务失败:', error);
  }
}

/**
 * 设置API性能跟踪
 */
function setupApiPerformanceTracking(): void {
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      // 保存原始fetch
      const originalFetch = window.fetch;
      
      // 重写fetch函数
      window.fetch = async function(input, init) {
        const startTime = performance.now();
        let url = typeof input === 'string' ? input : input.url;
        let method = init?.method || (typeof input === 'object' ? input.method : 'GET');
        let status = 0;
        
        try {
          const response = await originalFetch(input, init);
          status = response.status;
          
          // 克隆响应并返回原始响应
          const clonedResponse = response.clone();
          
          // 计算持续时间并上报
          const duration = performance.now() - startTime;
          
          // 过滤掉性能指标自身的接口调用，避免无限循环
          if (!url.includes('/api/performance-metrics')) {
            reportApiPerformance({
              endpoint: url,
              method: method,
              duration: duration,
              status: status,
              timestamp: new Date().toISOString()
            });
          }
          
          return response;
        } catch (error) {
          // 计算持续时间并上报错误
          const duration = performance.now() - startTime;
          
          if (!url.includes('/api/performance-metrics')) {
            reportApiPerformance({
              endpoint: url,
              method: method,
              duration: duration,
              status: 0, // 错误
              timestamp: new Date().toISOString()
            });
          }
          
          throw error;
        }
      };
    }
  } catch (error) {
    console.error('设置API性能跟踪失败:', error);
  }
}

/**
 * 上报API性能数据
 */
function reportApiPerformance(data: ApiPerformanceData): void {
  try {
    // 使用sendBeacon API在后台发送数据
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/performance-metrics/api', JSON.stringify(data));
    } else {
      // 回退到fetch API
      fetch('/api/performance-metrics/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        keepalive: true
      });
    }
  } catch (error) {
    console.error('上报API性能数据失败:', error);
  }
} 